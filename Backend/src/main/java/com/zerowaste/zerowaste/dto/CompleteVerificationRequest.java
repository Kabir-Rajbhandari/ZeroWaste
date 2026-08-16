package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Submitted from the "Upon clicking the link, the user enters the verification
 * code and sets a new password" step of UC1 (Register Users and Privacy
 * Settings). The token identifies which pending registration this belongs to
 * (it came from the link in the query string); the code is what the user typed
 * in from the email; the new password replaces the one set at step 3 of
 * registration.
 */
@Getter
@Setter
public class CompleteVerificationRequest {

    @NotBlank(message = "Verification link is missing its token.")
    private String token;

    @NotBlank(message = "Verification code is required.")
    @Pattern(regexp = "\\d{6}", message = "Verification code must be exactly 6 digits.")
    private String code;

    @NotBlank(message = "New password is required.")
    @Size(min = 8, message = "Password must be at least 8 characters.")
    private String newPassword;

    @NotBlank(message = "Please confirm your new password.")
    private String confirmNewPassword;
}
