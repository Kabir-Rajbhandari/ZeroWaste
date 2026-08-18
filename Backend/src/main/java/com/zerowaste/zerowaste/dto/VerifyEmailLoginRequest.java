package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyEmailLoginRequest {

    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    private String email;

    @NotBlank(message = "Verification code is required.")
    @Pattern(regexp = "\\d{6}", message = "Verification code must be exactly 6 digits.")
    private String code;

    @NotBlank(message = "Please confirm your password.")
    @Size(min = 8, message = "Password must be at least 8 characters.")
    private String confirmPassword;
}
