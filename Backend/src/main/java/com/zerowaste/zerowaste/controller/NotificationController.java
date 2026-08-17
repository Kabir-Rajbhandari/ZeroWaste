package com.zerowaste.zerowaste.controller;

import com.zerowaste.zerowaste.dto.NotificationResponse;
import com.zerowaste.zerowaste.service.DonationRequestService;
import com.zerowaste.zerowaste.service.NotificationService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final DonationRequestService donationRequestService;

    public NotificationController(
            NotificationService notificationService,
            DonationRequestService donationRequestService) {

        this.notificationService = notificationService;
        this.donationRequestService = donationRequestService;
    }

    @GetMapping
    public List<NotificationResponse> list(
            @AuthenticationPrincipal Long userId) {

        return notificationService.getForUser(userId);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(
            @AuthenticationPrincipal Long userId) {

        return Map.of(
                "count",
                notificationService.unreadCount(userId)
        );
    }

    @PutMapping("/read-all")
    public void markAllRead(
            @AuthenticationPrincipal Long userId) {

        notificationService.markAllRead(userId);
    }

    @PutMapping("/{id}/read")
    public NotificationResponse markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {

        return notificationService.markRead(id, userId);
    }

    @PostMapping("/{id}/accept")
    public void accept(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {

        donationRequestService.accept(id, userId);
    }

    @PostMapping("/{id}/decline")
    public void decline(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {

        donationRequestService.decline(id, userId);
    }
}
