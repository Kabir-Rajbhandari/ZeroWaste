package com.zerowaste.zerowaste.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FoodItemRequest {

    @NotBlank(message = "Food name is required.")
    private String name;

    @NotBlank(message = "Category is required.")
    private String category;

    @NotNull(message = "Quantity is required.")
    @Positive(message = "Quantity must be greater than zero.")
    private Double quantity;

    @NotBlank(message = "Quantity unit is required.")
    private String quantityUnit;

    @NotNull(message = "Expiry date is required.")
    private LocalDate expiryDate;

    private String imageUrl;

    // Optional — matches the use case's "Storage location (optional)".
    private String storageLocation;

    // Optional — "Remarks/notes".
    private String notes;
}
