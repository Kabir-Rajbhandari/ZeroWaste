package com.zerowaste.zerowaste.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends the 6-digit 2FA OTP email (used for both "enable 2FA" and "login with
 * 2FA" flows).
 *
 * This is deliberately its own bean rather than an @Async method inside
 * TwoFactorService: Spring's @Async only intercepts calls that arrive through
 * the Spring proxy from a DIFFERENT bean. TwoFactorService.initiate2FA(),
 * initiateLogin2FA(), and resendOtp() all used to call a private sendOtpEmail()
 * method on themselves (self-invocation), which — even if marked @Async — would
 * have run synchronously anyway and silently ignored the annotation. Putting it
 * here, called from TwoFactorService as a genuinely separate bean, guarantees
 * the send actually happens on a background thread instead of blocking
 * Login/Enable-2FA/Resend-code.
 */
@Service
public class OtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    public OtpEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * The OTP is already saved to the database by the caller before this runs,
     * so if delivery fails here (logged only — there's no HTTP request left to
     * report it to by the time a background thread picks this up), the person
     * can still use "Resend Code" to try again.
     */
    @Async
    public void sendOtpEmail(String toEmail, String fullName, String otp, int otpExpiryMinutes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("ZeroWaste — Your 2FA Verification Code");

            String html = buildEmailHtml(fullName, otp, otpExpiryMinutes);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (Exception ex) {
            System.err.println("[2FA] Failed to send OTP email to " + toEmail + ": " + ex.getMessage());
        }
    }

    private String buildEmailHtml(String fullName, String otp, int otpExpiryMinutes) {
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
