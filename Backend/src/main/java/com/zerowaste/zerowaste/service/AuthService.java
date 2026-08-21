package com.zerowaste.zerowaste.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
import com.zerowaste.zerowaste.dto.UserResponse;
import com.zerowaste.zerowaste.dto.VerificationTokenStatusResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.UserRepository;


@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TwoFactorService twoFactorService;
    private final EmailVerificationService emailVerificationService;

    private static final int VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
    private static final int RESET_CODE_EXPIRY_MINUTES = 15;
    private static final SecureRandom RANDOM = new SecureRandom();

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            TwoFactorService twoFactorService,
            EmailVerificationService emailVerificationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.twoFactorService = twoFactorService;
        this.emailVerificationService = emailVerificationService;
    }

    // ── Step 1: register 
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            // Alt-flow 3a: email already registered.
            throw new ApiException("An account with this email already exists.", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .householdSize(normalizeHouseholdSize(request.getHouseholdSize()))
                .emailVerified(false)
                .donationPublic(true)
                .twoFactorEnabled(false)
                .build();

        User saved = Objects.requireNonNull(userRepository.save(user), "Failed to save user");

        return new RegisterResponse(
                UserResponse.from(saved),
                "Account created! Next, configure your privacy and security settings.");
    }

    // ── Step 2: privacy & security configuration - sends the email 
    public MessageResponse configureRegistrationSecurity(RegistrationSecurityRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("No pending registration found for this email.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return new MessageResponse("Your email is already verified. You can log in.");
        }

        if (request.getDonationPublic() != null) {
            user.setDonationPublic(request.getDonationPublic());
        }
        user.setTwoFactorEnabled(Boolean.TRUE.equals(request.getEnableTwoFactor()));

        String verificationToken = UUID.randomUUID().toString();
        String verificationCode = generateSixDigitCode();
        Instant expiresAt = Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS);

        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiresAt(expiresAt);
        user.setOtpCode(verificationCode);
        user.setOtpExpiresAt(expiresAt);

        userRepository.save(user);

        emailVerificationService.sendVerificationEmail(
                user.getEmail(), user.getFullName(), verificationToken, verificationCode);

        return new MessageResponse("Please check your email for your verification code.");
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("Invalid email or password.", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ApiException("Invalid email or password.", HttpStatus.UNAUTHORIZED);
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(
                    "Please finish verifying your email address before logging in. Check your inbox for the verification link and code we sent when you signed up.",
                    HttpStatus.FORBIDDEN);
        }

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            twoFactorService.initiateLogin2FA(user);
            return new LoginResponse(
                    null,
                    UserResponse.from(user),
                    true,
                    "A 6-digit verification code has been sent to your registered email address.");
        }

        return new LoginResponse(jwtService.generateToken(user), UserResponse.from(user), false, null);
    }

    public MessageResponse resendVerificationEmail(ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("No account found with this email address.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return new MessageResponse("Your email is already verified. You can log in.");
        }

        String verificationToken = UUID.randomUUID().toString();
        String verificationCode = generateSixDigitCode();
        Instant expiresAt = Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS);

        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiresAt(expiresAt);
        user.setOtpCode(verificationCode);
        user.setOtpExpiresAt(expiresAt);
        userRepository.save(user);

        emailVerificationService.sendVerificationEmail(
                user.getEmail(), user.getFullName(), verificationToken, verificationCode);

        return new MessageResponse("A new verification email has been sent! Please check your inbox.");
    }

    // ── Step 3: read-only check when the user first lands on the link
    public VerificationTokenStatusResponse checkVerificationToken(String token) {
        if (token == null || token.isBlank()) {
            return new VerificationTokenStatusResponse(false, false, "Invalid verification link.");
        }

        return userRepository.findByVerificationToken(token.trim())
                .map(user -> {
                    if (Boolean.TRUE.equals(user.getEmailVerified())) {
                        return new VerificationTokenStatusResponse(
                                true, true, "Your email is already verified. You can log in.");
                    }
                    if (user.getVerificationTokenExpiresAt() == null
                            || Instant.now().isAfter(user.getVerificationTokenExpiresAt())) {
                        return new VerificationTokenStatusResponse(
                                false, false,
                                "This verification link has expired. Please register again or request a new email.");
                    }
                    return new VerificationTokenStatusResponse(true, false, "Enter your verification code to continue.");
                })
                .orElseGet(() -> new VerificationTokenStatusResponse(false, false, "Invalid verification link."));
    }

    // ── Step 3 (continued): verification code - account activation 

    public MessageResponse completeRegistration(CompleteVerificationRequest request) {
        User user = userRepository.findByVerificationToken(request.getToken().trim())
                .orElseThrow(() -> new ApiException("Invalid verification link.", HttpStatus.BAD_REQUEST));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return new MessageResponse("This link has already been used. Your email is already verified — you can log in.");
        }

        if (user.getVerificationTokenExpiresAt() == null
                || Instant.now().isAfter(user.getVerificationTokenExpiresAt())) {
            throw new ApiException(
                    "This verification link has expired. Please register again or request a new email.",
                    HttpStatus.GONE);
        }

        // Alt-flow, Line 6: invalid or expired code → prompt the user to
        // request a new one, without invalidating the still-good link/token.
        if (user.getOtpCode() == null || user.getOtpExpiresAt() == null) {
            throw new ApiException(
                    "No verification code found for this link. Please request a new code.",
                    HttpStatus.BAD_REQUEST);
        }
        if (Instant.now().isAfter(user.getOtpExpiresAt())) {
            throw new ApiException(
                    "This verification code has expired. Please request a new code.",
                    HttpStatus.GONE);
        }
        if (!user.getOtpCode().equals(request.getCode().trim())) {
            throw new ApiException(
                    "Invalid verification code. Please check your email and try again.",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        
        user.setEmailVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        userRepository.save(user);

        return new MessageResponse("Your account has been verified and activated! You can now log in.");
    }

    public MessageResponse resendCode(ResendCodeRequest request) {
        User user = userRepository.findByVerificationToken(request.getToken().trim())
                .orElseThrow(() -> new ApiException("Invalid verification link.", HttpStatus.BAD_REQUEST));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return new MessageResponse("Your email is already verified. You can log in.");
        }

        String verificationCode = generateSixDigitCode();
        Instant expiresAt = Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS);

    
        user.setVerificationTokenExpiresAt(expiresAt);
        user.setOtpCode(verificationCode);
        user.setOtpExpiresAt(expiresAt);
        userRepository.save(user);

        emailVerificationService.sendVerificationEmail(
                user.getEmail(), user.getFullName(), user.getVerificationToken(), verificationCode);

        return new MessageResponse("A new verification code has been sent to your email.");
    }

    // ── Forgot Password: request a reset code
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("No account found with this email address.", HttpStatus.NOT_FOUND));

        String resetCode = generateSixDigitCode();
        Instant expiresAt = Instant.now().plus(RESET_CODE_EXPIRY_MINUTES, ChronoUnit.MINUTES);

        user.setResetPasswordCode(resetCode);
        user.setResetPasswordCodeExpiresAt(expiresAt);
        userRepository.save(user);

        emailVerificationService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetCode);

        return new MessageResponse("A verification code has been sent to your email.");
    }

    // ── Forgot Password: submit code + new password 
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("No account found with this email address.", HttpStatus.NOT_FOUND));

        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new ApiException("Passwords do not match.", HttpStatus.BAD_REQUEST);
        }

        if (user.getResetPasswordCode() == null || user.getResetPasswordCodeExpiresAt() == null) {
            throw new ApiException(
                    "No reset code found for this account. Please request a new one.",
                    HttpStatus.BAD_REQUEST);
        }
        if (Instant.now().isAfter(user.getResetPasswordCodeExpiresAt())) {
            clearResetCode(user);
            userRepository.save(user);
            throw new ApiException(
                    "This reset code has expired. Please request a new one.",
                    HttpStatus.GONE);
        }
        if (!user.getResetPasswordCode().equals(request.getCode().trim())) {
            throw new ApiException(
                    "Invalid verification code. Please check your email and try again.",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        clearResetCode(user);
        userRepository.save(user);

        return new MessageResponse("Your password has been reset! You can now log in.");
    }

    private void clearResetCode(User user) {
        user.setResetPasswordCode(null);
        user.setResetPasswordCodeExpiresAt(null);
    }

    public AuthResponse verifyLogin2FA(LoginOtpRequest request) {
        User user = twoFactorService.verifyLogin2FA(request.getEmail(), request.getCode());
        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserResponse.from(user));
    }

    private Integer normalizeHouseholdSize(Integer householdSize) {
        if (householdSize == null) {
            return null;
        }
        return Math.max(1, householdSize);
    }

    private String generateSixDigitCode() {
        int code = 100_000 + RANDOM.nextInt(900_000);
        return String.valueOf(code);
    }
}
