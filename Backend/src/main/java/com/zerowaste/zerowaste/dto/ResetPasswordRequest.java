package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * "...then user can update their password." Step 2: submit the code plus
 * the new password to actually change it.
 */
@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    private String email;

    @NotBlank(message = "Verification code is required.")
    @Pattern(regexp = "\\d{6}", message = "Verification code must be exactly 6 digits.")
    private String code;

    @NotBlank(message = "New password is required.")
    @Size(min = 8, message = "Password must be at least 8 characters.")
    private String newPassword;

    @NotBlank(message = "Please confirm your new password.")
    private String confirmNewPassword;
}