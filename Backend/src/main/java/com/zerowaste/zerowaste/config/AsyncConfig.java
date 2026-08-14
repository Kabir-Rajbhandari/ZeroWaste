package com.zerowaste.zerowaste.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Dedicated, bounded thread pool for background work — right now just outbound
 * emails (verification links, 2FA OTPs).
 *
 * Before this existed, sending those emails happened directly on the HTTP
 * request thread inside EmailVerificationService / TwoFactorService, so
 * Register, Login (for 2FA users), and Resend-code all sat there waiting on a
 * full Gmail SMTP handshake before the browser got any response — that was the
 * actual cause of "register/login feels slow". Now the DB write finishes, the
 * HTTP response goes back to the person immediately, and the email goes out a
 * moment later on one of these worker threads instead of blocking their click.
 *
 * Pool is intentionally small and bounded (not Spring's default unbounded
 * SimpleAsyncTaskExecutor) so a burst of signups can't spawn unlimited threads;
 * overflow beyond the pool + queue just waits briefly for a free worker instead
 * of starving the app.
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("zw-async-");
        executor.initialize();
        return executor;
    }
}
