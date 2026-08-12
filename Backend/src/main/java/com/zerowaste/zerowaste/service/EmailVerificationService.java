package com.zerowaste.zerowaste.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.exception.ApiException;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends the one-time email-verification link a user must click after signing up
 * before they can log in for the first time.
 *
 * Kept separate from TwoFactorService intentionally — this is a distinct flow
 * (link-based, one-time-ever) from the 2FA OTP flow (code-based, repeats on
 * every login), and the two should not share state or code.
 */
@Service
public class EmailVerificationService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    /**
     * Base URL of the frontend app, used to build the link embedded in the
     * email. Defaults to the Vite dev server address.
     */
    @Value("${app.frontend.base-url:${app.frontend.url:http://localhost:5173}}")
    private String frontendBaseUrl;

    public EmailVerificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String fullName, String token) {
        String verificationLink = frontendBaseUrl + "/signup?token=" + token;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("ZeroWaste — Verify your email address");

            String html = buildEmailHtml(fullName, verificationLink);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (Exception ex) {
            System.err.println("[EmailVerification] Failed to send verification email to " + toEmail + ": " + ex.getMessage());
            throw new ApiException(
                    "We could not send the verification email. Please check your email address and try again.",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private String buildEmailHtml(String fullName, String verificationLink) {
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
                            <p style="margin:0 0 28px;color:#4a5a4a;font-size:0.95rem;line-height:1.6;">
                              Thanks for signing up for ZeroWaste! Please confirm your email
                              address to activate your account and log in for the first time.
                            </p>

                            <!-- CTA Button -->
                            <div style="text-align:center;margin:0 0 28px;">
                              <a href="%s"
                                 style="display:inline-block;background:#3d6b35;color:#ffffff;
                                        text-decoration:none;font-weight:700;font-size:1rem;
                                        padding:14px 36px;border-radius:8px;">
                                Verify My Email
                              </a>
                            </div>

                            <p style="margin:0 0 16px;color:#4a5a4a;font-size:0.9rem;line-height:1.6;">
                              This link is valid for <strong>24 hours</strong>. If you did not
                              create a ZeroWaste account, you can safely ignore this email.
                            </p>
                            <p style="margin:0;color:#7a8a7a;font-size:0.78rem;line-height:1.6;word-break:break-all;">
                              Or paste this link into your browser:<br>%s
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
                """.formatted(fullName, verificationLink, verificationLink);
    }
}
