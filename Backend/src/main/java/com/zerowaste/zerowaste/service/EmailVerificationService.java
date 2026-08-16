package com.zerowaste.zerowaste.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailVerificationService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    public EmailVerificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * @param code the 6-digit verification code the user will be asked to
     *             re-enter on the confirmation screen after clicking the
     *             link (UC1: "a confirmation link with the 6 digit
     *             verification code").
     */
    @Async
    public void sendVerificationEmail(String toEmail, String fullName, String token, String code) {
        try {
            // 1. URL-encode token to prevent broken query parameters (+, =, /, spaces)
            String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);

            // Clean base URL trailing slash if present
            String baseUrl = frontendBaseUrl.endsWith("/")
                    ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                    : frontendBaseUrl;

            String verificationLink = baseUrl + "/signup?token=" + encodedToken;

            MimeMessage message = mailSender.createMimeMessage();
            // Use false for second parameter unless sending inline images/attachments
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("ZeroWaste — Verify your email address");

            String html = buildEmailHtml(fullName, verificationLink, code);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (Exception ex) {
            System.err.println("[EmailVerification] Failed to send verification email to " + toEmail + ": " + ex.getMessage());
        }
    }

    private String buildEmailHtml(String fullName, String verificationLink, String code) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify your email</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f7f4;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%%;-ms-text-size-adjust:100%%;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7f4;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);width:100%%;max-width:520px;">

                      <!-- Header -->
                      <tr>
                        <td style="background-color:#3d6b35;padding:28px 40px;text-align:center;">
                          <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;font-family:Arial,sans-serif;">
                            ZeroWaste
                          </h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:36px 40px;">
                          <p style="margin:0 0 16px;color:#2d3a2d;font-size:16px;line-height:24px;">
                            Hi <strong>%s</strong>,
                          </p>
                          <p style="margin:0 0 28px;color:#4a5a4a;font-size:15px;line-height:24px;">
                            Thanks for signing up for ZeroWaste! Click the button below, then enter the verification code below to confirm your email and set your account password.
                          </p>

                          <!-- Bulletproof CTA Button -->
                          <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                            <tr>
                              <td align="center">
                                <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="center" style="border-radius:8px;background-color:#3d6b35;">
                                      <a href="%s" target="_blank" style="font-size:16px;font-family:Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 36px;border:1px solid #3d6b35;display:inline-block;font-weight:bold;">
                                        Verify My Email
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- 6-digit verification code -->
                          <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                            <tr>
                              <td align="center">
                                <p style="margin:0 0 8px;color:#4a5a4a;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
                                  Your verification code
                                </p>
                                <div style="display:inline-block;background-color:#f4f7f4;border:1px dashed #3d6b35;border-radius:8px;padding:14px 28px;">
                                  <span style="font-family:'Courier New',monospace;font-size:28px;font-weight:bold;letter-spacing:8px;color:#3d6b35;">
                                    %s
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;color:#4a5a4a;font-size:14px;line-height:22px;">
                            The link and code are both valid for <strong>24 hours</strong>. If you did not create a ZeroWaste account, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color:#f4f7f4;padding:20px 40px;text-align:center;border-top:1px solid #e0ebe0;">
                          <p style="margin:0;color:#7a8a7a;font-size:12px;line-height:18px;">
                            &copy; 2026 ZeroWaste - Smart Food Waste Management<br>
                            This is an automated message - please do not reply.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(fullName, verificationLink, code);
    }

    /**
     * "Forgot Password" flow: sends just the 6-digit code (no link — the
     * user is already inside the app on the reset screen).
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject("ZeroWaste — Your password reset code");

            String html = buildPasswordResetHtml(fullName, code);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (Exception ex) {
            System.err.println("[EmailVerification] Failed to send password reset email to " + toEmail + ": " + ex.getMessage());
        }
    }

    private String buildPasswordResetHtml(String fullName, String code) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset your password</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f7f4;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%%;-ms-text-size-adjust:100%%;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7f4;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);width:100%%;max-width:520px;">

                      <!-- Header -->
                      <tr>
                        <td style="background-color:#3d6b35;padding:28px 40px;text-align:center;">
                          <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;font-family:Arial,sans-serif;">
                            ZeroWaste
                          </h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:36px 40px;">
                          <p style="margin:0 0 16px;color:#2d3a2d;font-size:16px;line-height:24px;">
                            Hi <strong>%s</strong>,
                          </p>
                          <p style="margin:0 0 28px;color:#4a5a4a;font-size:15px;line-height:24px;">
                            We received a request to reset your ZeroWaste password. Enter the code below to continue.
                          </p>

                          <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                            <tr>
                              <td align="center">
                                <p style="margin:0 0 8px;color:#4a5a4a;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
                                  Your password reset code
                                </p>
                                <div style="display:inline-block;background-color:#f4f7f4;border:1px dashed #3d6b35;border-radius:8px;padding:14px 28px;">
                                  <span style="font-family:'Courier New',monospace;font-size:28px;font-weight:bold;letter-spacing:8px;color:#3d6b35;">
                                    %s
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;color:#4a5a4a;font-size:14px;line-height:22px;">
                            This code is valid for <strong>15 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color:#f4f7f4;padding:20px 40px;text-align:center;border-top:1px solid #e0ebe0;">
                          <p style="margin:0;color:#7a8a7a;font-size:12px;line-height:18px;">
                            &copy; 2026 ZeroWaste - Smart Food Waste Management<br>
                            This is an automated message - please do not reply.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(fullName, code);
    }
}