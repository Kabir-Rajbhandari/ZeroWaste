package com.zerowaste.zerowaste.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Read-only check performed the moment the user lands on the verification link,
 * BEFORE anything is mutated. Lets the frontend decide which screen to show:
 * the code+password form (valid), an "already verified" screen
 * (alreadyVerified), or an expired/invalid-link screen (neither).
 */
@Getter
@AllArgsConstructor
public class VerificationTokenStatusResponse {

    private boolean valid;
    private boolean alreadyVerified;
    private String message;
}
