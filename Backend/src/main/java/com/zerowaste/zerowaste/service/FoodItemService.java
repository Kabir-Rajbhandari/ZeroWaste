package com.zerowaste.zerowaste.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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

    /**
     * Window (inclusive on both ends) in which an item can be moved into the
     * Donation Listing: it must be "nearing expiry" — not already expired, and
     * not so far out that donating it yet would be premature.
     */
    private static final long MIN_DAYS_BEFORE_EXPIRY_FOR_DONATION = 1;
    private static final long MAX_DAYS_BEFORE_EXPIRY_FOR_DONATION = 7;

    private final FoodItemRepository foodItemRepository;
    private final UserRepository userRepository;
    private final DonationClaimRequestRepository claimRequestRepository;
    private final NotificationRepository notificationRepository;
    private final FoodActivityLogRepository activityLogRepository;
    private final ActivityLogService activityLogService;
    private final ExpiryAlertService expiryAlertService;

    public FoodItemService(FoodItemRepository foodItemRepository,
            UserRepository userRepository,
            DonationClaimRequestRepository claimRequestRepository,
            NotificationRepository notificationRepository,
            FoodActivityLogRepository activityLogRepository,
            ActivityLogService activityLogService,
            ExpiryAlertService expiryAlertService) {
        this.foodItemRepository = foodItemRepository;
        this.userRepository = userRepository;
        this.claimRequestRepository = claimRequestRepository;
        this.notificationRepository = notificationRepository;
        this.activityLogRepository = activityLogRepository;
        this.activityLogService = activityLogService;
        this.expiryAlertService = expiryAlertService;
    }

    public List<FoodItemResponse> getAllForUser(Long userId) {
        return foodItemRepository.findByUserIdOrderByExpiryDateAsc(userId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDonated()))
                // Items already moved to the Donation Listing live there, not
                // in the main inventory view, until reverted or finalized.
                .filter(item -> !Boolean.TRUE.equals(item.getListedForDonation()))
                .map(FoodItemResponse::from)
                .toList();
    }

    /**
     * Items the user has moved into their Donation Listing via "Convert to
     * Donation", pending the final "Convert Donation" step (pickup details) or
     * a revert back to the inventory.
     */
    public List<FoodItemResponse> getDonationListingForUser(Long userId) {
        return foodItemRepository
                .findByUserIdAndListedForDonationTrueAndDonatedFalseOrderByExpiryDateAsc(userId)
                .stream()
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

        // If the item being added is already within its 1-3 day (or same-day)
        // expiry window, fire its first Alerts notification right now instead
        // of waiting for tomorrow's 6 AM scheduler run.
        userRepository.findById(userId)
                .ifPresent(user -> expiryAlertService.generateIfDue(savedItem, user, LocalDate.now()));

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

        // Editing the expiry date can also move an item straight into the
        // 0-3 day window — check the same way a fresh add does.
        userRepository.findById(userId)
                .ifPresent(user -> expiryAlertService.generateIfDue(savedItem, user, LocalDate.now()));

        return FoodItemResponse.from(savedItem);
    }

    /**
     * Step 1 of the donation flow: "User selects item nearing expiry and clicks
     * 'Convert to Donation'." Moves the item out of the main inventory and into
     * the Donation Listing — it is NOT yet publicly visible in Browse Food
     * Item. Only allowed while the item is between 1 and 7 days from expiring
     * (inclusive); anything more/less than that is rejected with a specific
     * message so the frontend can show it in a popup.
     */
    public FoodItemResponse listForDonation(Long id, Long userId) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(item.getDonated())) {
            throw new ApiException("This item has already been donated.", HttpStatus.BAD_REQUEST);
        }
        if (Boolean.TRUE.equals(item.getListedForDonation())) {
            throw new ApiException("This item is already in your Donation Listing.", HttpStatus.BAD_REQUEST);
        }
        if (item.getExpiryDate() == null) {
            throw new ApiException("This item has no expiry date set.", HttpStatus.BAD_REQUEST);
        }

        long daysUntilExpiry = ChronoUnit.DAYS.between(LocalDate.now(), item.getExpiryDate());

        if (daysUntilExpiry < MIN_DAYS_BEFORE_EXPIRY_FOR_DONATION) {
            throw new ApiException(
                    "This item has already expired or expires today, so it can no longer be listed for donation.",
                    HttpStatus.BAD_REQUEST);
        }
        if (daysUntilExpiry > MAX_DAYS_BEFORE_EXPIRY_FOR_DONATION) {
            throw new ApiException(
                    "This item isn't close enough to its expiry date yet. Items can only be listed for "
                    + "donation once they're within 7 days of expiring.",
                    HttpStatus.BAD_REQUEST);
        }

        item.setListedForDonation(true);
        FoodItem saved = foodItemRepository.save(item);

        activityLogService.record(userId, "LISTED_FOR_DONATION", saved.getCategory(), saved.getName(),
                saved.getQuantity());

        return FoodItemResponse.from(saved);
    }

    /**
     * Sends an item from the Donation Listing back to the regular Food
     * Inventory (the "revert to the food inventory" action).
     */
    public FoodItemResponse revertToInventory(Long id, Long userId) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(item.getDonated())) {
            throw new ApiException("This item has already been donated and can no longer be reverted.",
                    HttpStatus.BAD_REQUEST);
        }
        if (!Boolean.TRUE.equals(item.getListedForDonation())) {
            throw new ApiException("This item isn't in your Donation Listing.", HttpStatus.BAD_REQUEST);
        }

        item.setListedForDonation(false);
        FoodItem saved = foodItemRepository.save(item);

        activityLogService.record(userId, "REVERTED_TO_INVENTORY", saved.getCategory(), saved.getName(),
                saved.getQuantity());

        return FoodItemResponse.from(saved);
    }

    /**
     * Step 2 of the donation flow: "Convert Donation" from the Donation
     * Listing. Requires the item to already be listed (step 1 above) —
     * attempting to donate straight from the inventory is rejected. This is
     * also where the item finally becomes visible in Browse Food Item.
     */
    public FoodItemResponse donate(Long id, Long userId, DonateRequest request) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(item.getDonated())) {
            throw new ApiException("This item has already been donated.", HttpStatus.BAD_REQUEST);
        }
        if (!Boolean.TRUE.equals(item.getListedForDonation())) {
            throw new ApiException(
                    "Add this item to your Donation Listing first (\"Convert to Donation\"), then finish it "
                    + "from there.",
                    HttpStatus.BAD_REQUEST);
        }
        if (item.getExpiryDate() != null && item.getExpiryDate().isBefore(LocalDate.now())) {
            throw new ApiException("This item has already expired and can no longer be donated.",
                    HttpStatus.BAD_REQUEST);
        }

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
     * set to public — a private donation stays private, including the fact that
     * it exists.
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
