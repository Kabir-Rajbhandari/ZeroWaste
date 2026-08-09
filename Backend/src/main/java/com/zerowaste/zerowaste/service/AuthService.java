package com.zerowaste.zerowaste.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.service.TwoFactorService;
import com.zerowaste.zerowaste.dto.AuthResponse;
import com.zerowaste.zerowaste.dto.LoginOtpRequest;
import com.zerowaste.zerowaste.dto.LoginRequest;
import com.zerowaste.zerowaste.dto.LoginResponse;
import com.zerowaste.zerowaste.dto.MessageResponse;
import com.zerowaste.zerowaste.dto.RegisterRequest;
import com.zerowaste.zerowaste.dto.RegisterResponse;
import com.zerowaste.zerowaste.dto.ResendVerificationRequest;
import com.zerowaste.zerowaste.dto.UserResponse;
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

    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            throw new ApiException("An account with this email already exists.", HttpStatus.CONFLICT);
        }

        String verificationToken = UUID.randomUUID().toString();

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .householdSize(normalizeHouseholdSize(request.getHouseholdSize()))
                .emailVerified(false)
                .verificationToken(verificationToken)
                .verificationTokenExpiresAt(Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS))
                .build();

        User saved = Objects.requireNonNull(userRepository.save(user), "Failed to save user");

        emailVerificationService.sendVerificationEmail(saved.getEmail(), saved.getFullName(), verificationToken);

        return new RegisterResponse(
                UserResponse.from(saved),
                "Account created! Please check your email to verify your address before logging in.");
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("Invalid email or password.", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ApiException("Invalid email or password.", HttpStatus.UNAUTHORIZED);
        }

        // First-login gate: account must be email-verified before any token is issued.
        // Once true this never needs checking again — verification is a one-time step.
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(
                    "Please verify your email address before logging in. Check your inbox for the verification link we sent when you signed up.",
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

    /**
     * Re-sends the email-verification link for an unverified account. Used by
     * the "Resend verification email" action on the sign-in page, which only
     * appears once login has told the user their account isn't verified yet.
     */
    public MessageResponse resendVerificationEmail(ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("No account found with this email address.", HttpStatus.NOT_FOUND));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return new MessageResponse("Your email is already verified. You can log in.");
        }

        String verificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiresAt(Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS));
        userRepository.save(user);

        emailVerificationService.sendVerificationEmail(user.getEmail(), user.getFullName(), verificationToken);

        return new MessageResponse("Verification email resent! Please check your inbox.");
    }

    public MessageResponse verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException("Invalid verification link.", HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findByVerificationToken(token.trim())
                .orElseThrow(() -> new ApiException("Invalid or expired verification link.", HttpStatus.BAD_REQUEST));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            // Link clicked again after already being verified — this is not an
            // error, just a reused link. Say so explicitly rather than a generic
            // "verified" message so the UI can tell the two cases apart.
            return new MessageResponse("This link has already been used. Your email is already verified — you can log in.");
        }

        if (user.getVerificationTokenExpiresAt() == null || Instant.now().isAfter(user.getVerificationTokenExpiresAt())) {
            throw new ApiException("This verification link has expired. Please contact support or register again.", HttpStatus.GONE);
        }

        user.setEmailVerified(true);
        // NOTE: intentionally NOT clearing verificationToken here. If we null it
        // out, a second click on the same link can no longer be matched by
        // findByVerificationToken above, so it falls into the "Invalid or expired
        // verification link" branch instead of the "already used" branch. Leaving
        // the token in place (it's harmless once emailVerified is true — this
        // method never re-verifies) lets repeat visits be recognized correctly.
        userRepository.save(user);

        return new MessageResponse("Your email has been verified! You can now log in.");
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
}
