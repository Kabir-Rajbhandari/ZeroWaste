package com.zerowaste.zerowaste.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.dto.ChangePasswordRequest;
import com.zerowaste.zerowaste.dto.PrivacyRequest;
import com.zerowaste.zerowaste.dto.UpdateProfileRequest;
import com.zerowaste.zerowaste.dto.UserResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
            NotificationRepository notificationRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse getProfile(Long userId) {
        User user = findUser(userId);
        return UserResponse.from(user);
    }

    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUser(userId);

        String newEmail = request.getEmail().toLowerCase().trim();
        if (!newEmail.equalsIgnoreCase(user.getEmail())
                && userRepository.existsByEmail(newEmail)) {
            throw new ApiException("An account with this email already exists.", HttpStatus.CONFLICT);
        }

        user.setFullName(request.getFullName().trim());
        user.setEmail(newEmail);
        user.setGender(blankToNull(request.getGender()));
        user.setAddress(blankToNull(request.getAddress()));
        user.setHouseholdSize(normalizeHouseholdSize(request.getHouseholdSize()));
        // profileImageUrl is intentionally untouched here — it's only ever
        // set by updateProfileImage() below, via its own dedicated upload
        // endpoint. See the note on UpdateProfileRequest for why.

        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    /**
     * Persists an uploaded profile picture's bytes directly in the database
     * (User.profileImageData) instead of the local filesystem, and points
     * profileImageUrl at the endpoint that serves those bytes back out.
     */
    public UserResponse updateProfileImage(Long userId, byte[] imageData, String contentType) {
        User user = findUser(userId);
        user.setProfileImageData(imageData);
        user.setProfileImageContentType(contentType);
        user.setProfileImageUrl("/api/users/" + userId + "/profile-image");
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Fetches the stored profile-image bytes for the given user, if any.
     * Returns null when the user has no image on file (never uploaded one, or
     * their only profileImageUrl is an external link they typed in).
     */
    public ProfileImageStorageService.StoredImage getProfileImageBytes(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getProfileImageData() == null || user.getProfileImageData().length == 0) {
            return null;
        }
        return new ProfileImageStorageService.StoredImage(
                user.getProfileImageData(), user.getProfileImageContentType());
    }

    public UserResponse updatePrivacy(Long userId, PrivacyRequest request) {
        User user = findUser(userId);
        user.setDonationPublic(request.getDonationPublic());
        User saved = userRepository.save(user);

        boolean isPublic = Boolean.TRUE.equals(request.getDonationPublic());
        notify(userId, isPublic ? "PRIVACY_PUBLIC" : "PRIVACY_PRIVATE", "Donations",
                "Donation Privacy Updated",
                isPublic
                        ? "Your donations are now public and visible to everyone in Browse Food Item."
                        : "Your donations are now private and only visible to you.");

        return UserResponse.from(saved);
    }

    public UserResponse updateNotifications(Long userId, boolean enabled) {
        User user = findUser(userId);
        user.setNotificationsEnabled(enabled);
        user.setExpiryAlertsEnabled(enabled);
        user.setDonationUpdatesEnabled(enabled);
        User saved = userRepository.save(user);

        notify(userId, enabled ? "NOTIFICATIONS_ON" : "NOTIFICATIONS_OFF", "System",
                "Notifications Updated",
                enabled
                        ? "All notification preferences have been turned on."
                        : "All notification preferences have been turned off.");

        return UserResponse.from(saved);
    }

    public UserResponse updateExpiryAlerts(Long userId, boolean enabled) {
        User user = findUser(userId);
        user.setExpiryAlertsEnabled(enabled);
        User saved = userRepository.save(user);

        notify(userId, enabled ? "EXPIRY_ALERTS_ON" : "EXPIRY_ALERTS_OFF", "Alerts",
                "Expiry Alerts Updated",
                enabled
                        ? "Expiry alert notifications have been turned on."
                        : "Expiry alert notifications have been turned off.");

        return UserResponse.from(saved);
    }

    public UserResponse updateDonationUpdates(Long userId, boolean enabled) {
        User user = findUser(userId);
        user.setDonationUpdatesEnabled(enabled);
        User saved = userRepository.save(user);

        notify(userId, enabled ? "DONATION_UPDATES_ON" : "DONATION_UPDATES_OFF", "Donations",
                "Donation Updates Updated",
                enabled
                        ? "Donation update notifications have been turned on."
                        : "Donation update notifications have been turned off.");

        return UserResponse.from(saved);
    }

    // For the protion of 2FA authentication, we will just toggle the boolean value for now. In a real-world application, you would implement a more robust 2FA system.
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ApiException("Current password is incorrect.", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        notify(userId, "PASSWORD_CHANGED", "System",
                "Password Changed",
                "Your account password has been updated successfully.");
    }

    private void notify(Long userId, String type, String category, String title, String message) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .category(category)
                .title(title)
                .message(message)
                .read(false)
                .resolved(true)
                .build();

        notificationRepository.save(notification);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Integer normalizeHouseholdSize(Integer householdSize) {
        if (householdSize == null) {
            return null;
        }
        return Math.max(1, householdSize);
    }
}
