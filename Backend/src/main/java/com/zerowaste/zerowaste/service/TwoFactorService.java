package com.zerowaste.zerowaste.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.dto.UserResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

@Service
public class TwoFactorService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final OtpEmailService otpEmailService;

    @Value("${app.2fa.otp-expiry-minutes:10}")
    private int otpExpiryMinutes;

    private static final SecureRandom RANDOM = new SecureRandom();

    public TwoFactorService(UserRepository userRepository,
            NotificationRepository notificationRepository,
            OtpEmailService otpEmailService) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.otpEmailService = otpEmailService;
    }

    // ── Step 1: User toggles 2FA on - send OTP email 
    public void initiate2FA(Long userId) {
        User user = findUser(userId);

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            // Already fully enabled — nothing to do.
            return;
        }

        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        user.setPendingTwoFactor(true);
        userRepository.save(user);

        otpEmailService.sendOtpEmail(user.getEmail(), user.getFullName(), otp, otpExpiryMinutes);
    }

    // ── Step 2: User submits the code - activate 2FA 
    public UserResponse verify2FA(Long userId, String submittedCode) {
        User user = findUser(userId);

        if (!Boolean.TRUE.equals(user.getPendingTwoFactor())) {
            throw new ApiException("No pending 2FA verification for this account.", HttpStatus.BAD_REQUEST);
        }

        if (user.getOtpCode() == null || user.getOtpExpiresAt() == null) {
            throw new ApiException("No OTP found. Please request a new code.", HttpStatus.BAD_REQUEST);
        }

        if (Instant.now().isAfter(user.getOtpExpiresAt())) {
            // Expired — clear and prompt for re-send
            clearOtp(user);
            userRepository.save(user);
            throw new ApiException(
                    "The verification code has expired. Please request a new one.",
                    HttpStatus.GONE);
        }

        if (!user.getOtpCode().equals(submittedCode.trim())) {
            throw new ApiException("Invalid verification code. Please try again.", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        user.setTwoFactorEnabled(true);
        user.setPendingTwoFactor(false);
        clearOtp(user);
        User saved = userRepository.save(user);

        notify(userId,
                "TWO_FACTOR_ON", "System",
                "Two-Factor Authentication Enabled",
                "Two-factor authentication has been successfully enabled for your account.");

        return UserResponse.from(saved);
    }

    // ── Login: 2FA-enabled user signs in - send OTP email
    public void initiateLogin2FA(User user) {
        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        userRepository.save(user);

        otpEmailService.sendOtpEmail(user.getEmail(), user.getFullName(), otp, otpExpiryMinutes);
    }

    // ── Login: User submits the login OTP - completes authentication 
    public User verifyLogin2FA(String email, String submittedCode) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new ApiException("Invalid email or verification code.", HttpStatus.UNAUTHORIZED));

        if (!Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            throw new ApiException("Two-factor authentication is not enabled for this account.", HttpStatus.BAD_REQUEST);
        }

        if (user.getOtpCode() == null || user.getOtpExpiresAt() == null) {
            throw new ApiException("No OTP found. Please log in again to request a new code.", HttpStatus.BAD_REQUEST);
        }

        if (Instant.now().isAfter(user.getOtpExpiresAt())) {
            clearOtp(user);
            userRepository.save(user);
            throw new ApiException(
                    "The verification code has expired. Please log in again to request a new one.",
                    HttpStatus.GONE);
        }

        if (!user.getOtpCode().equals(submittedCode.trim())) {
            throw new ApiException("Invalid verification code. Please try again.", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        clearOtp(user);
        return userRepository.save(user);
    }

    // ── Resend: User requests a fresh OTP
    public void resendOtp(Long userId) {
        User user = findUser(userId);

        if (!Boolean.TRUE.equals(user.getPendingTwoFactor())) {
            throw new ApiException("No pending 2FA verification. Please toggle 2FA on first.", HttpStatus.BAD_REQUEST);
        }

        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        userRepository.save(user);

        otpEmailService.sendOtpEmail(user.getEmail(), user.getFullName(), otp, otpExpiryMinutes);
    }

    // ── Disable: User toggles 2FA off
    public UserResponse disable2FA(Long userId) {
        User user = findUser(userId);
        user.setTwoFactorEnabled(false);
        user.setPendingTwoFactor(false);
        clearOtp(user);
        User saved = userRepository.save(user);

        notify(userId,
                "TWO_FACTOR_OFF", "System",
                "Two-Factor Authentication Disabled",
                "Two-factor authentication has been turned off for your account.");

        return UserResponse.from(saved);
    }

    // ── Cancel: User dismisses the OTP modal without verifying 
    public UserResponse cancelPending2FA(Long userId) {
        User user = findUser(userId);
        user.setPendingTwoFactor(false);
        clearOtp(user);
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    // ── Helpers 
    private String generateOtp() {
        int code = 100_000 + RANDOM.nextInt(900_000);   // always exactly 6 digits
        return String.valueOf(code);
    }

    private void clearOtp(User user) {
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found.", HttpStatus.NOT_FOUND));
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

    // Email sending itself now lives in OtpEmailService (see its class
    // Javadoc for why it had to be a separate bean rather than a method
    // here).
}
