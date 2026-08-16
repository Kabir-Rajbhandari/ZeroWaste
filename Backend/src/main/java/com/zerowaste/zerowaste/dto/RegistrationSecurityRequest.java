package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * "After successful registration... the user is taken to privacy/security
 * configuration... User enables 2FA → System saves the security preference" —
 * submitted as its own step, separate from the registration form itself.
 * Identified by email (the account isn't verified/active yet, so there's no JWT
 * to authenticate with).
 */
@Getter
@Setter
public class RegistrationSecurityRequest {

    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    private String email;

    /**
     * Food-listing visibility. Defaults to true (public) if omitted.
     */
    private Boolean donationPublic;

    /**
     * Defaults to false (off) if omitted.
     */
    private Boolean enableTwoFactor;
}
