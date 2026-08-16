package com.zerowaste.zerowaste.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * UC1 Alternative Course, Line 6: "If the entered verification code is invalid
 * or expired, the system prompts the user to request a new code." Identified by
 * the token already in the URL (not by email — the user is sitting on the
 * verification screen, not the signup form).
 */
@Getter
@Setter
public class ResendCodeRequest {

    @NotBlank(message = "Verification link is missing its token.")
    private String token;
}
