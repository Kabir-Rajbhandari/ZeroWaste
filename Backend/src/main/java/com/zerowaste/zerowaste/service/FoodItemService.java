package com.zerowaste.zerowaste.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.dto.DonateRequest;
import com.zerowaste.zerowaste.dto.FoodItemRequest;
import com.zerowaste.zerowaste.dto.FoodItemResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.DonationClaimRequest;
import com.zerowaste.zerowaste.model.FoodActivityLog;
import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.DonationClaimRequestRepository;
import com.zerowaste.zerowaste.repository.FoodActivityLogRepository;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

@Service
public class FoodItemService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("Dairy", "Meat", "Fruits", "Vegetable", "Other");
    private static final Set<String> ALLOWED_UNITS = Set.of("Kg", "Ltr", "Gram");

    private final FoodItemRepository foodItemRepository;
    private final UserRepository userRepository;
    private final DonationClaimRequestRepository claimRequestRepository;
    private final NotificationRepository notificationRepository;
    private final FoodActivityLogRepository activityLogRepository;
    private final ActivityLogService activityLogService;

    public FoodItemService(FoodItemRepository foodItemRepository,
            UserRepository userRepository,
            DonationClaimRequestRepository claimRequestRepository,
            NotificationRepository notificationRepository,
            FoodActivityLogRepository activityLogRepository,
            ActivityLogService activityLogService) {
        this.foodItemRepository = foodItemRepository;
        this.userRepository = userRepository;
        this.claimRequestRepository = claimRequestRepository;
        this.notificationRepository = notificationRepository;
        this.activityLogRepository = activityLogRepository;
        this.activityLogService = activityLogService;
    }

    public List<FoodItemResponse> getAllForUser(Long userId) {
        return foodItemRepository.findByUserIdOrderByExpiryDateAsc(userId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDonated()))
                .map(FoodItemResponse::from)
                .toList();
    }

    public List<FoodItemResponse> getAvailableForBrowse(Long userId) {
        List<FoodItem> donatedItems = foodItemRepository.findByDonatedTrueOrderByExpiryDateAsc();
        if (donatedItems.isEmpty()) {
            return List.of();
        }

        Set<Long> donorIds = donatedItems.stream()
                .map(item -> item != null ? item.getUserId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> donorsById = userRepository.findAllById(donorIds).stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(User::getId, u -> u));

        List<FoodItem> visible = donatedItems.stream()
                .filter(item -> {
                    boolean isOwn = item.getUserId().equals(userId);
                    if (isOwn) {
                        return true; // donors always see their own donations
                    }
                    User donor = donorsById.get(item.getUserId());
                    return donor != null && Boolean.TRUE.equals(donor.getDonationPublic());
                })
                .toList();

        Set<Long> visibleIds = visible.stream()
                .filter(Objects::nonNull)
                .map(FoodItem::getId)
                .collect(Collectors.toSet());
        Set<Long> requestedByMe = claimRequestRepository
                .findByFoodItemIdInAndRequesterIdAndStatus(visibleIds, userId, "PENDING")
                .stream()
                .filter(Objects::nonNull)
                .map(DonationClaimRequest::getFoodItemId)
                .collect(Collectors.toSet());

        return visible.stream()
                .map(item -> {
                    boolean isOwn = item.getUserId().equals(userId);
                    User donor = donorsById.get(item.getUserId());
                    String donorName = donor != null ? donor.getFullName() : "Anonymous";
                    String donorProfileImageUrl = donor != null ? donor.getProfileImageUrl() : null;
                    Boolean donorPublic = donor != null ? donor.getDonationPublic() : null;
                    boolean alreadyRequested = requestedByMe.contains(item.getId());
                    return FoodItemResponse.from(item, donorName, isOwn, donorPublic, alreadyRequested, donorProfileImageUrl);
                })
                .toList();
    }

    public FoodItemResponse create(FoodItemRequest request, Long userId) {
        validateCategory(request.getCategory());
        validateUnit(request.getQuantityUnit());

        FoodItem item = FoodItem.builder()
                .name(request.getName().trim())
                .category(request.getCategory())
                .quantity(request.getQuantity())
                .quantityUnit(request.getQuantityUnit())
                .expiryDate(request.getExpiryDate())
                .imageUrl(blankToNull(request.getImageUrl()))
                .storageLocation(blankToNull(request.getStorageLocation()))
                .notes(blankToNull(request.getNotes()))
                .userId(userId)
                .build();

        FoodItem savedItem = foodItemRepository.save(item);
        activityLogService.record(userId, "ADDED", savedItem.getCategory(), savedItem.getName(),
                savedItem.getQuantity());
        return FoodItemResponse.from(savedItem);
    }

    public FoodItemResponse update(Long id, FoodItemRequest request, Long userId) {
        validateCategory(request.getCategory());
        validateUnit(request.getQuantityUnit());

        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        item.setName(request.getName().trim());
        item.setCategory(request.getCategory());
        item.setQuantity(request.getQuantity());
        item.setQuantityUnit(request.getQuantityUnit());
        item.setExpiryDate(request.getExpiryDate());
        item.setImageUrl(blankToNull(request.getImageUrl()));
        item.setStorageLocation(blankToNull(request.getStorageLocation()));
        item.setNotes(blankToNull(request.getNotes()));

        FoodItem savedItem = foodItemRepository.save(item);
        activityLogService.record(userId, "UPDATED", savedItem.getCategory(), savedItem.getName(),
                savedItem.getQuantity());
        return FoodItemResponse.from(savedItem);
    }

    public FoodItemResponse donate(Long id, Long userId, DonateRequest request) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        item.setDonated(true);

        if (request != null) {
            item.setPickupLocation(blankToNull(request.getLocation()));
            item.setAvailableTime(blankToNull(request.getAvailableTime()));
            item.setContactDetail(blankToNull(request.getContactDetail()));
        }

        FoodItem saved = foodItemRepository.save(item);

        activityLogService.record(userId, "DONATED", saved.getCategory(), saved.getName(), saved.getQuantity());

        notifyEveryoneOfNewDonation(saved, userId);

        return FoodItemResponse.from(saved);
    }

    /**
     * Marks an item as successfully used (eaten/cooked) before it went to
     * waste. Logs a USED event — which is what "Food Saved" on the Analytics
     * page counts — then removes the item from the inventory.
     */
    public FoodItemResponse markUsed(Long id, Long userId) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(item.getDonated())) {
            throw new ApiException("This item has already been donated.", HttpStatus.BAD_REQUEST);
        }

        activityLogService.record(userId, "USED", item.getCategory(), item.getName(), item.getQuantity());

        FoodItemResponse response = FoodItemResponse.from(item);
        foodItemRepository.delete(item);
        return response;
    }

    /**
     * Broadcasts "X has put Y up for donation" to every other user, so anyone
     * browsing can find out about new donations without having to keep
     * refreshing Browse Food Item. Only fires when the donor's donations are
     * set to public — if the donor is private, nobody else is told, and only
     * the donor gets a notification (their own "Donation Listed" confirmation,
     * added automatically by ActivityLogService when the DONATED event above
     * is recorded).
     */
    private void notifyEveryoneOfNewDonation(FoodItem item, Long donorId) {
        User donor = userRepository.findById(donorId).orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));
        if (donor == null || !Boolean.TRUE.equals(donor.getDonationPublic())) {
            return;
        }

        List<User> everyoneElse = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(donorId))
                .toList();
        if (everyoneElse.isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        List<Notification> broadcast = everyoneElse.stream()
                .map(u -> Notification.builder()
                .userId(u.getId())
                .type("NEW_DONATION")
                .category("Donations")
                .title("New Donation Available")
                .message(donor.getFullName() + " has put \"" + item.getName() + "\" up for donation. Check it out in Browse Food Item!")
                .read(false)
                .resolved(true)
                .itemName(item.getName())
                .createdAt(now)
                .build())
                .toList();

        notificationRepository.saveAll(broadcast);
    }

    /**
     * Removes an item outright. If it had already expired and wasn't donated,
     * this counts as waste for the Analytics page — deleting a still-good item
     * you simply don't want anymore does not.
     */
    public void delete(Long id, Long userId) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        boolean isExpired = item.getExpiryDate() != null && item.getExpiryDate().isBefore(LocalDate.now());
        if (isExpired && !Boolean.TRUE.equals(item.getDonated())) {
            activityLogService.record(userId, "WASTED", item.getCategory(), item.getName(), item.getQuantity());
        } else {
            // Manually removing an item that hadn't expired yet isn't waste —
            // still worth a feed entry so "Deleted X" shows up for the user.
            activityLogService.record(userId, "REMOVED", item.getCategory(), item.getName(), item.getQuantity());
        }

        foodItemRepository.delete(item);
    }

    /**
     * Return recent activity log entries for the given user, newest first.
     */
    public List<FoodActivityLog> getRecentActivity(Long userId, int limit) {
        return activityLogRepository.findByUserIdOrderByOccurredAtDesc(userId).stream()
                .limit(limit)
                .toList();
    }

    private void validateCategory(String category) {
        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new ApiException("Invalid category.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateUnit(String unit) {
        if (!ALLOWED_UNITS.contains(unit)) {
            throw new ApiException("Invalid quantity unit.", HttpStatus.BAD_REQUEST);
        }
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}