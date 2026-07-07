package com.zerowaste.zerowaste.dto;

import com.zerowaste.zerowaste.model.FoodItem;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class FoodItemResponse {
    private Long id;
    private String name;
    private String category;
    private Double quantity;
    private String quantityUnit;
    private LocalDate expiryDate;
    private String imageUrl;
    private Boolean donated;
    private String donorName;
    private String pickupLocation;
    private String availableTime;
    private String contactDetail;

    public static FoodItemResponse from(FoodItem item) {
        return from(item, null);
    }

    public static FoodItemResponse from(FoodItem item, String donorName) {
        return new FoodItemResponse(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getQuantity(),
                item.getQuantityUnit(),
                item.getExpiryDate(),
                item.getImageUrl(),
                item.getDonated(),
                donorName,
                item.getPickupLocation(),
                item.getAvailableTime(),
                item.getContactDetail()
        );
    }
}