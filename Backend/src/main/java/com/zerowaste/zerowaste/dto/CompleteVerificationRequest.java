package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * Submitted from the "Upon clicking the link, the user enters the verification
 * code" step of UC1 (Register Users and Privacy Settings). The token identifies
 * which pending registration this belongs to (it came from the link in the
 * query string); the code is what the user typed in from the email. The
 * account's password was already set back at the registration step, so it is
 * not collected again here.
 */
@Getter
@Setter
public class CompleteVerificationRequest {

    @NotBlank(message = "Verification link is missing its token.")
    private String token;

    @NotBlank(message = "Verification code is required.")
    @Pattern(regexp = "\\d{6}", message = "Verification code must be exactly 6 digits.")
    private String code;
}
