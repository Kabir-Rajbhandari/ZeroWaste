package com.zerowaste.zerowaste.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.zerowaste.zerowaste.security.JwtAuthFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                // Profile pictures are fetched via plain <img src="..."> tags, which
                // can't attach an Authorization header, so this specific path must
                // stay public even though the rest of /api/users/** requires auth.
                // (Matchers are evaluated in order, so this must come first.)
                .requestMatchers("/api/users/*/profile-image").permitAll()
                // Sitewide impact numbers shown on the public homepage (Hero
                // + Impact Strip) — must be reachable by logged-out visitors,
                // unlike the rest of /api/analytics/** which is per-user
                // dashboard data. (Matchers are evaluated in order, so this
                // must come before the /api/analytics/** rule below.)
                .requestMatchers("/api/analytics/community-impact").permitAll()
                .requestMatchers("/api/food-items/**").authenticated()
                .requestMatchers("/api/users/**").authenticated()
                .requestMatchers("/api/notifications/**").authenticated()
                .requestMatchers("/api/analytics/**").authenticated()
                .requestMatchers("/api/meal-plans/**").authenticated()
                .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
