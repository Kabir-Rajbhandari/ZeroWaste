package com.zerowaste.zerowaste.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ExpiryAlertResponse {

    private Long id;

    private String name;

    private String category;

    private Double quantity;

    private String quantityUnit;

    private LocalDate expiryDate;

    private String imageUrl;

    private long daysRemaining;

    private String status;
}
