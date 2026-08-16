package com.zerowaste.zerowaste.controller;

import com.zerowaste.zerowaste.dto.AuthResponse;
import com.zerowaste.zerowaste.dto.CompleteVerificationRequest;
import com.zerowaste.zerowaste.dto.ForgotPasswordRequest;
import com.zerowaste.zerowaste.dto.LoginOtpRequest;
import com.zerowaste.zerowaste.dto.LoginRequest;
import com.zerowaste.zerowaste.dto.LoginResponse;
import com.zerowaste.zerowaste.dto.MessageResponse;
import com.zerowaste.zerowaste.dto.RegisterRequest;
import com.zerowaste.zerowaste.dto.RegisterResponse;
import com.zerowaste.zerowaste.dto.RegistrationSecurityRequest;
import com.zerowaste.zerowaste.dto.ResendCodeRequest;
import com.zerowaste.zerowaste.dto.ResendVerificationRequest;
import com.zerowaste.zerowaste.dto.ResetPasswordRequest;
import com.zerowaste.zerowaste.dto.VerificationTokenStatusResponse;
import com.zerowaste.zerowaste.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    /**
     * "The user is taken to privacy/security configuration... User enables 2FA
     * → System saves the security preference" then immediately sends the
     * verification email (link + 6-digit code).
     */
    @PostMapping("/configure-security")
    public MessageResponse configureSecurity(@Valid @RequestBody RegistrationSecurityRequest request) {
        return authService.configureRegistrationSecurity(request);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/login/verify")
    public AuthResponse verifyLoginOtp(@Valid @RequestBody LoginOtpRequest request) {
        return authService.verifyLogin2FA(request);
    }

    /**
     * Read-only precheck fired the instant the confirmation page loads (from
     * the emailed link). Does NOT activate the account — that only happens once
     * the user also submits their code + new password below. Lets the frontend
     * decide which screen to show: the code+password form, an "already
     * verified" screen, or an expired/invalid-link screen.
     */
    @GetMapping("/verify-email/status")
    public VerificationTokenStatusResponse verifyEmailStatus(@RequestParam String token) {
        return authService.checkVerificationToken(token);
    }

    /**
     * "Upon clicking the link, the user enters the verification code and sets a
     * new password" → "System activate the account".
     */
    @PostMapping("/complete-registration")
    public MessageResponse completeRegistration(@Valid @RequestBody CompleteVerificationRequest request) {
        return authService.completeRegistration(request);
    }

    /**
     * Alt-flow, Line 6: "If the entered verification code is invalid or
     * expired, the system prompts the user to request a new code." Identified
     * by the token still in the URL, not by email.
     */
    @PostMapping("/resend-code")
    public MessageResponse resendCode(@Valid @RequestBody ResendCodeRequest request) {
        return authService.resendCode(request);
    }

    @PostMapping("/resend-verification")
    public MessageResponse resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        return authService.resendVerificationEmail(request);
    }

    /**
     * "If user forgot their password then the system send a verification
     * code..." Step 1.
     */
    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    /**
     * "...and then user can update their password." Step 2.
     */
    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }
}
