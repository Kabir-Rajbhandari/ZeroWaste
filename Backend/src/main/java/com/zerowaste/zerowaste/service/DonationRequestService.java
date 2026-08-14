package com.zerowaste.zerowaste.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.DonationClaimRequest;
import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.DonationClaimRequestRepository;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

@Service
public class DonationRequestService {

    private final FoodItemRepository foodItemRepository;
    private final UserRepository userRepository;
    private final DonationClaimRequestRepository claimRequestRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogService activityLogService;

    public DonationRequestService(FoodItemRepository foodItemRepository,
            UserRepository userRepository,
            DonationClaimRequestRepository claimRequestRepository,
            NotificationRepository notificationRepository,
            ActivityLogService activityLogService) {
        this.foodItemRepository = foodItemRepository;
        this.userRepository = userRepository;
        this.claimRequestRepository = claimRequestRepository;
        this.notificationRepository = notificationRepository;
        this.activityLogService = activityLogService;
    }

    /**
     * Called when someone clicks "Claim Donations". Instead of transferring the
     * item right away, this creates a pending request and notifies the donor,
     * who can Accept or Decline from their Notifications page. Multiple people
     * can request the same item; only the one the donor accepts receives it.
     */
    @Transactional
    public void requestClaim(Long foodItemId, Long requesterId) {
        FoodItem item = foodItemRepository.findById(foodItemId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        if (!Boolean.TRUE.equals(item.getDonated())) {
            throw new ApiException("This item is not available for claiming.", HttpStatus.BAD_REQUEST);
        }
        if (item.getUserId().equals(requesterId)) {
            throw new ApiException("You cannot claim your own donation.", HttpStatus.BAD_REQUEST);
        }

        User donor = userRepository.findById(item.getUserId())
                .orElseThrow(() -> new ApiException("Donor not found.", HttpStatus.NOT_FOUND));
        if (!Boolean.TRUE.equals(donor.getDonationPublic())) {
            throw new ApiException("This item is not available for claiming.", HttpStatus.BAD_REQUEST);
        }

        boolean alreadyRequested = claimRequestRepository
                .findByFoodItemIdAndRequesterIdAndStatus(foodItemId, requesterId, "PENDING")
                .isPresent();
        if (alreadyRequested) {
            throw new ApiException("You already requested this item. Please wait for the donor's response.", HttpStatus.BAD_REQUEST);
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));

        DonationClaimRequest claimRequest = claimRequestRepository.save(
                DonationClaimRequest.builder()
                        .foodItemId(foodItemId)
                        .requesterId(requesterId)
                        .donorId(donor.getId())
                        .status("PENDING")
                        .build()
        );

        Notification newNotification = Notification.builder()
                .userId(donor.getId())
                .type("DONATION_REQUEST")
                .category("Donations")
                .title("New Claim Request")
                .message(requester.getFullName() + " requested to claim your donation: " + item.getName() + ".")
                .read(false)
                .resolved(false)
                .claimRequestId(claimRequest.getId())
                .requesterName(requester.getFullName())
                .itemName(item.getName())
                .build();
        notificationRepository.save(newNotification);

        // Log against the REQUESTER's own feed — "Requested Bread" — not the
        // donor's, since this is the requester's action.
        activityLogService.record(requesterId, "REQUESTED", item.getCategory(), item.getName(), item.getQuantity());
    }

    /**
     * Donor accepts a specific claim request: the item moves into that
     * requester's Food Inventory, and every other pending request for the same
     * item is automatically declined (with a notification to each of those
     * other requesters).
     */
    @Transactional
    public void accept(Long notificationId, Long donorUserId) {
        Notification notification = requireOwnActionableNotification(notificationId, donorUserId);

        DonationClaimRequest claimRequest = claimRequestRepository.findById(notification.getClaimRequestId())
                .orElseThrow(() -> new ApiException("Claim request not found.", HttpStatus.NOT_FOUND));
        requirePendingAndOwnedByDonor(claimRequest, donorUserId);

        FoodItem item = foodItemRepository.findById(claimRequest.getFoodItemId())
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));
        if (!Boolean.TRUE.equals(item.getDonated())) {
            throw new ApiException("This item is no longer available.", HttpStatus.BAD_REQUEST);
        }

        // Transfer ownership to the accepted requester's Food Inventory.
        item.setUserId(claimRequest.getRequesterId());
        item.setDonated(false);
        item.setPickupLocation(null);
        item.setAvailableTime(null);
        item.setContactDetail(null);
        foodItemRepository.save(item);

        claimRequest.setStatus("ACCEPTED");
        claimRequestRepository.save(claimRequest);

        notification.setResolved(true);
        notification.setRead(true);
        notificationRepository.save(notification);

        Notification acceptedNotification = Notification.builder()
                .userId(claimRequest.getRequesterId())
                .type("DONATION_ACCEPTED")
                .category("Donations")
                .title("Donation Accepted")
                .message("Your request for \"" + item.getName() + "\" was accepted! It's now in your Food Inventory.")
                .read(false)
                .resolved(true)
                .itemName(item.getName())
                .build();
        notificationRepository.save(acceptedNotification);

        // Auto-decline every other still-pending request for this item.
        List<DonationClaimRequest> others = claimRequestRepository.findByFoodItemIdAndStatus(item.getId(), "PENDING");
        for (DonationClaimRequest other : others) {
            other.setStatus("DECLINED");
            claimRequestRepository.save(other);

            notificationRepository.findFirstByClaimRequestId(other.getId()).ifPresent(reqNotif -> {
                Notification existingNotification = reqNotif;
                existingNotification.setResolved(true);
                notificationRepository.save(existingNotification);
            });

            Notification declinedNotification = Notification.builder()
                    .userId(other.getRequesterId())
                    .type("DONATION_DECLINED")
                    .category("Donations")
                    .title("Donation Declined")
                    .message("Your request for \"" + item.getName() + "\" was given to another requester.")
                    .read(false)
                    .resolved(true)
                    .itemName(item.getName())
                    .build();
            notificationRepository.save(declinedNotification);
        }
    }

    /**
     * Donor declines a specific claim request. The item stays available for
     * everyone else — including any other pending requests, which are left
     * untouched.
     */
    @Transactional
    public void decline(Long notificationId, Long donorUserId) {
        Notification notification = requireOwnActionableNotification(notificationId, donorUserId);

        DonationClaimRequest claimRequest = claimRequestRepository.findById(notification.getClaimRequestId())
                .orElseThrow(() -> new ApiException("Claim request not found.", HttpStatus.NOT_FOUND));
        requirePendingAndOwnedByDonor(claimRequest, donorUserId);

        claimRequest.setStatus("DECLINED");
        claimRequestRepository.save(claimRequest);

        notification.setResolved(true);
        notification.setRead(true);
        notificationRepository.save(notification);

        String itemName = foodItemRepository.findById(claimRequest.getFoodItemId())
                .map(item -> item != null ? item.getName() : null)
                .orElse("the item");

        Notification declinedNotification = Notification.builder()
                .userId(claimRequest.getRequesterId())
                .type("DONATION_DECLINED")
                .category("Donations")
                .title("Donation Declined")
                .message("Your request for \"" + itemName + "\" was declined by the donor.")
                .read(false)
                .resolved(true)
                .itemName(itemName)
                .build();
        notificationRepository.save(declinedNotification);
    }

    private Notification requireOwnActionableNotification(Long notificationId, Long donorUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException("Notification not found.", HttpStatus.NOT_FOUND));
        if (!notification.getUserId().equals(donorUserId)) {
            throw new ApiException("Notification not found.", HttpStatus.NOT_FOUND);
        }
        if (notification.getClaimRequestId() == null) {
            throw new ApiException("This notification cannot be actioned.", HttpStatus.BAD_REQUEST);
        }
        if (Boolean.TRUE.equals(notification.getResolved())) {
            throw new ApiException("This request has already been handled.", HttpStatus.BAD_REQUEST);
        }
        return notification;
    }

    private void requirePendingAndOwnedByDonor(DonationClaimRequest claimRequest, Long donorUserId) {
        if (!claimRequest.getDonorId().equals(donorUserId)) {
            throw new ApiException("You are not authorized to act on this request.", HttpStatus.FORBIDDEN);
        }
        if (!"PENDING".equals(claimRequest.getStatus())) {
            throw new ApiException("This request has already been handled.", HttpStatus.BAD_REQUEST);
        }
    }
}
