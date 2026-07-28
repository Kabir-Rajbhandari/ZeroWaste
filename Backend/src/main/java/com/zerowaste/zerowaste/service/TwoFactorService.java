package com.zerowaste.zerowaste.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.dto.UserResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

import jakarta.mail.internet.MimeMessage;

/**
 * Handles the 2FA enable/disable flow:
 *
 * 1. User toggles 2FA ON → initiate2FA() → generates OTP, emails it, marks
 * pendingTwoFactor=true 2. User enters the OTP → verify2FA() → validates OTP,
 * sets twoFactorEnabled=true, clears OTP 3. User toggles 2FA OFF → disable2FA()
 * → immediately sets twoFactorEnabled=false (no OTP needed)
 */
@Service
public class TwoFactorService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Value("${app.2fa.otp-expiry-minutes:10}")
    private int otpExpiryMinutes;

    private static final SecureRandom RANDOM = new SecureRandom();

    public TwoFactorService(UserRepository userRepository,
            NotificationRepository notificationRepository,
            JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
    }

    // ── Step 1: User toggles 2FA on → send OTP email ───────────────────────
    /**
     * Generates a 6-digit OTP, persists it on the user, and sends the
     * verification email. Returns immediately; the account is NOT yet
     * 2FA-enabled.
     */
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

        sendOtpEmail(user.getEmail(), user.getFullName(), otp);
    }

    // ── Step 2: User submits the code → activate 2FA ───────────────────────
    /**
     * Validates the supplied OTP. On success, enables 2FA and clears the OTP
     * fields. On failure, throws ApiException (caller should NOT clear the OTP
     * so the user can retry until it expires).
     */
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

        // ✅ Correct OTP — activate 2FA
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

    // ── Login: 2FA-enabled user signs in → send OTP email ──────────────────
    /**
     * Generates a fresh OTP for a user who is already fully 2FA-enabled and is
     * attempting to log in. Does not touch pendingTwoFactor/twoFactorEnabled,
     * since those belong to the enable-2FA flow, not the login flow.
     */
    public void initiateLogin2FA(User user) {
        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        userRepository.save(user);

        sendOtpEmail(user.getEmail(), user.getFullName(), otp);
    }

    // ── Login: User submits the login OTP → completes authentication ───────
    /**
     * Validates the OTP submitted during login for a 2FA-enabled user. On
     * success, clears the OTP and returns the user so the caller can issue a
     * JWT. On failure, throws ApiException.
     */
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

    // ── Resend: User requests a fresh OTP ───────────────────────────────────
    /**
     * Re-generates and re-sends the OTP for a user who has a pending 2FA
     * initiation. Resets the expiry window.
     */
    public void resendOtp(Long userId) {
        User user = findUser(userId);

        if (!Boolean.TRUE.equals(user.getPendingTwoFactor())) {
            throw new ApiException("No pending 2FA verification. Please toggle 2FA on first.", HttpStatus.BAD_REQUEST);
        }

        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        userRepository.save(user);

        sendOtpEmail(user.getEmail(), user.getFullName(), otp);
    }

    // ── Disable: User toggles 2FA off (no OTP required) ────────────────────
    /**
     * Immediately disables 2FA. Also cancels any in-flight enable attempt.
     */
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

    // ── Cancel: User dismisses the OTP modal without verifying ─────────────
    /**
     * Cancels a pending 2FA enable attempt (user closed the modal). Resets
     * pendingTwoFactor and clears the OTP without enabling 2FA.
     */
    public UserResponse cancelPending2FA(Long userId) {
        User user = findUser(userId);
        user.setPendingTwoFactor(false);
        clearOtp(user);
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────
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

    // ── Email ────────────────────────────────────────────────────────────────
    private void sendOtpEmail(String toEmail, String fullName, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("ZeroWaste — Your 2FA Verification Code");

            String html = buildEmailHtml(fullName, otp);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (Exception ex) {
            // Log but don't crash — the OTP is already saved; the user can request a resend.
            System.err.println("[2FA] Failed to send OTP email to " + toEmail + ": " + ex.getMessage());
            throw new ApiException(
                    "We could not send the verification email. Please check your email address and try again.",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private String buildEmailHtml(String fullName, String otp) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f4f7f4;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
                    <tr><td align="center">
                      <table width="520" cellpadding="0" cellspacing="0"
                             style="background:#ffffff;border-radius:12px;overflow:hidden;
                                    box-shadow:0 4px 20px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                          <td style="background:#3d6b35;padding:28px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:1.6rem;letter-spacing:1px;">
                              ZeroWaste
                            </h1>
                          </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                          <td style="padding:36px 40px;">
                            <p style="margin:0 0 16px;color:#2d3a2d;font-size:1rem;">
                              Hi <strong>%s</strong>,
                            </p>
                            <p style="margin:0 0 24px;color:#4a5a4a;font-size:0.95rem;line-height:1.6;">
                              Welcome to ZeroWaste! You've requested to enable
                              <strong>Two-Factor Authentication</strong> on your account.
                              Use the code below to complete the setup:
                            </p>

                            <!-- OTP Box -->
                            <div style="text-align:center;margin:0 0 28px;">
                              <span style="display:inline-block;background:#edf5eb;border:2px dashed #3d6b35;
                                           border-radius:10px;padding:18px 40px;
                                           font-size:2.4rem;font-weight:700;
                                           letter-spacing:12px;color:#2d6a2d;">
                                %s
                              </span>
                            </div>

                            <p style="margin:0 0 16px;color:#4a5a4a;font-size:0.9rem;line-height:1.6;">
                              This OTP is valid for <strong>%d minutes</strong>.
                              If you did not request this, you can safely ignore this email —
                              your account remains unchanged.
                            </p>
                            <p style="margin:0;color:#4a5a4a;font-size:0.9rem;line-height:1.6;">
                              If the code has expired, return to your Settings page and click
                              <em>"Resend Code"</em> to get a new one.
                            </p>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background:#f4f7f4;padding:20px 40px;text-align:center;
                                     border-top:1px solid #e0ebe0;">
                            <p style="margin:0;color:#7a8a7a;font-size:0.78rem;">
                              &copy; 2026 ZeroWaste - Smart Food Waste Management<br>
                              This is an automated message - please do not reply.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(fullName, otp, otpExpiryMinutes);
    }
}
