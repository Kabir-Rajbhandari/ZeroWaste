package com.zerowaste.zerowaste.controller;

import java.time.Duration;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.zerowaste.zerowaste.dto.PrivacyRequest;
import com.zerowaste.zerowaste.dto.ToggleRequest;
import com.zerowaste.zerowaste.dto.UpdateProfileRequest;
import com.zerowaste.zerowaste.dto.UserResponse;
import com.zerowaste.zerowaste.dto.VerifyOtpRequest;
import com.zerowaste.zerowaste.service.ProfileImageStorageService;
import com.zerowaste.zerowaste.service.ProfileImageStorageService.StoredImage;
import com.zerowaste.zerowaste.service.TwoFactorService;
import com.zerowaste.zerowaste.service.UserService;

import jakarta.validation.Valid;

// Import Map for returning JSON responses
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final TwoFactorService twoFactorService;
    private final ProfileImageStorageService profileImageStorageService;
    // Declare TwoFactorService for handling 2FA operations

    // Constructor injection for UserService and TwoFactorService
    public UserController(UserService userService, TwoFactorService twoFactorService,
            ProfileImageStorageService profileImageStorageService) {
        this.userService = userService;
        this.twoFactorService = twoFactorService;
        this.profileImageStorageService = profileImageStorageService;
        // Initialize TwoFactorService
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Long userId) {
        return userService.getProfile(userId);
    }

    @PutMapping("/me")
    public UserResponse updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal Long userId) {
        return userService.updateProfile(userId, request);
    }

    @PostMapping("/me/profile-image")
    public UserResponse uploadProfileImage(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Long userId) {
        // Read + validate the upload, then store the bytes straight in the DB
        // (User.profileImageData) instead of writing them to local disk.
        StoredImage image = profileImageStorageService.readProfileImage(file);
        return userService.updateProfileImage(userId, image.data(), image.contentType());
    }

    /**
     * Serves a user's profile picture straight from the database. Public (no
     * auth) because <img src> tags can't send an Authorization header — this
     * mirrors the old behavior where /uploads/profile-images/** was served as a
     * public static resource.
     */
    @GetMapping("/{id}/profile-image")
    public ResponseEntity<byte[]> getProfileImage(@PathVariable Long id) {
        StoredImage image = userService.getProfileImageBytes(id);
        if (image == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .body(image.data());
    }

    @PutMapping("/me/privacy")
    public UserResponse updatePrivacy(
            @Valid @RequestBody PrivacyRequest request,
            @AuthenticationPrincipal Long userId) {
        return userService.updatePrivacy(userId, request);
    }

    // Mapping for changing password
    // ── 2FA endpoints ────────────────────────────────────────────────────────
    /**
     * POST /api/users/me/two-factor/initiate Triggers OTP generation and sends
     * the verification email. Call this when the user toggles 2FA ON in
     * Settings.
     */
    @PostMapping("/me/two-factor/initiate")
    public ResponseEntity<Map<String, String>> initiate2FA(
            @AuthenticationPrincipal Long userId) {
        twoFactorService.initiate2FA(userId);
        return ResponseEntity.ok(Map.of(
                "message", "A 6-digit verification code has been sent to your registered email address."));
    }

    /**
     * POST /api/users/me/two-factor/verify Accepts the 6-digit OTP and, on
     * success, activates 2FA.
     */
    @PostMapping("/me/two-factor/verify")
    public UserResponse verify2FA(
            @Valid @RequestBody VerifyOtpRequest request,
            @AuthenticationPrincipal Long userId) {
        return twoFactorService.verify2FA(userId, request.getCode());
    }

    /**
     * POST /api/users/me/two-factor/resend Re-generates and re-sends the OTP
     * when the current one has expired or was not received.
     */
    @PostMapping("/me/two-factor/resend")
    public ResponseEntity<Map<String, String>> resendOtp(
            @AuthenticationPrincipal Long userId) {
        // PostMapping for resending OTP
        twoFactorService.resendOtp(userId);
        return ResponseEntity.ok(Map.of(
                "message", "A new verification code has been sent to your registered email address."));
    }

    /**
     * DELETE /api/users/me/two-factor Immediately disables 2FA (no OTP required
     * to turn it off).
     */
    @DeleteMapping("/me/two-factor")
    public UserResponse disable2FA(@AuthenticationPrincipal Long userId) {
        return twoFactorService.disable2FA(userId);
    }

    /**
     * POST /api/users/me/two-factor/cancel Cancels a pending 2FA enable attempt
     * (user dismissed the OTP modal).
     */
    @PostMapping("/me/two-factor/cancel")
    public UserResponse cancelPending2FA(@AuthenticationPrincipal Long userId) {
        return twoFactorService.cancelPending2FA(userId);
    }

    // ── Existing preference toggles ──────────────────────────────────────────
    @PutMapping("/me/notifications")
    public UserResponse updateNotifications(
            @Valid @RequestBody ToggleRequest request,
            @AuthenticationPrincipal Long userId) {
        return userService.updateNotifications(userId, request.getEnabled());
    }

    @PutMapping("/me/expiry-alerts")
    public UserResponse updateExpiryAlerts(
            @Valid @RequestBody ToggleRequest request,
            @AuthenticationPrincipal Long userId) {
        return userService.updateExpiryAlerts(userId, request.getEnabled());
    }

    @PutMapping("/me/donation-updates")
    public UserResponse updateDonationUpdates(
            @Valid @RequestBody ToggleRequest request,
            @AuthenticationPrincipal Long userId) {
        return userService.updateDonationUpdates(userId, request.getEnabled());
    }

    // for the portion of 2FA authentication, we will just toggle the boolean value for now. In a real-world application, you would implement a more robust 2FA system.
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody com.zerowaste.zerowaste.dto.ChangePasswordRequest request,
            @AuthenticationPrincipal Long userId) {
        userService.changePassword(userId, request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }
}
