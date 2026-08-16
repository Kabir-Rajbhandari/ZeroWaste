package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * "If user forgot their password then the system send a verification code
 * and then user can update their password." Step 1: request the code.
 */
@Getter
@Setter
public class ForgotPasswordRequest {

    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    private String email;
}