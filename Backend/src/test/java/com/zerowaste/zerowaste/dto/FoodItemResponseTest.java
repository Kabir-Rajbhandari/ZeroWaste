package com.zerowaste.zerowaste.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.zerowaste.zerowaste.model.FoodItem;

class FoodItemResponseTest {

    @Test
    void browseResponseIncludesDonorProfileImageUrl() {
        FoodItem item = FoodItem.builder()
                .id(1L)
                .name("Apple Box")
                .category("Fruits")
                .quantity(5.0)
                .quantityUnit("Kg")
                .expiryDate(LocalDate.now().plusDays(2))
                .donated(true)
                .build();

        FoodItemResponse response = FoodItemResponse.from(
                item,
                "Alice",
                false,
                true,
                false,
                "/uploads/profile-images/alice.png"
        );

        assertThat(response.getDonorProfileImageUrl())
                .isEqualTo("/uploads/profile-images/alice.png");
    }
}
