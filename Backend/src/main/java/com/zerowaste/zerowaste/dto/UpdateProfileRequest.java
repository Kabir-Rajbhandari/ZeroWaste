package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {

    @NotBlank(message = "Full name is required.")
    private String fullName;

    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    private String email;

    // Optional
    private String gender;

    // Optional
    private String address;

    // Optional
    private Integer householdSize;

    // NOTE: profile picture updates go through the dedicated
}
