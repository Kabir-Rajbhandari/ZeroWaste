package com.zerowaste.zerowaste.service;

import com.zerowaste.zerowaste.dto.FoodItemRequest;
import com.zerowaste.zerowaste.dto.FoodItemResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class FoodItemService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("Dairy", "Meat", "Fruits", "Vegetable");
    private static final Set<String> ALLOWED_UNITS = Set.of("Kg", "Ltr");

    private final FoodItemRepository foodItemRepository;

    public FoodItemService(FoodItemRepository foodItemRepository) {
        this.foodItemRepository = foodItemRepository;
    }

    public List<FoodItemResponse> getAllForUser(Long userId) {
        return foodItemRepository.findByUserIdOrderByExpiryDateAsc(userId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDonated()))
                .map(FoodItemResponse::from)
                .toList();
    }

    public List<FoodItemResponse> getAvailableForBrowse(Long userId) {
        return foodItemRepository.findByDonatedTrueAndUserIdNotOrderByExpiryDateAsc(userId).stream()
                .map(FoodItemResponse::from)
                .toList();
    }

    public FoodItemResponse create(FoodItemRequest request, Long userId) {
        validateCategory(request.getCategory());
        validateUnit(request.getQuantityUnit());

        FoodItem item = FoodItem.builder()
                .name(request.getName().trim())
                .category(request.getCategory())
                .quantity(request.getQuantity())
                .quantityUnit(request.getQuantityUnit())
                .expiryDate(request.getExpiryDate())
                .imageUrl(blankToNull(request.getImageUrl()))
                .userId(userId)
                .build();

        return FoodItemResponse.from(foodItemRepository.save(item));
    }

    public FoodItemResponse update(Long id, FoodItemRequest request, Long userId) {
        validateCategory(request.getCategory());
        validateUnit(request.getQuantityUnit());

        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        item.setName(request.getName().trim());
        item.setCategory(request.getCategory());
        item.setQuantity(request.getQuantity());
        item.setQuantityUnit(request.getQuantityUnit());
        item.setExpiryDate(request.getExpiryDate());
        item.setImageUrl(blankToNull(request.getImageUrl()));

        return FoodItemResponse.from(foodItemRepository.save(item));
    }

    public FoodItemResponse donate(Long id, Long userId) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));

        item.setDonated(true);
        return FoodItemResponse.from(foodItemRepository.save(item));
    }

    public void delete(Long id, Long userId) {
        FoodItem item = foodItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Food item not found.", HttpStatus.NOT_FOUND));
        foodItemRepository.delete(item);
    }

    private void validateCategory(String category) {
        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new ApiException("Invalid category.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateUnit(String unit) {
        if (!ALLOWED_UNITS.contains(unit)) {
            throw new ApiException("Invalid quantity unit.", HttpStatus.BAD_REQUEST);
        }
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
