package com.zerowaste.zerowaste.repository;

import com.zerowaste.zerowaste.model.FoodItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {
    List<FoodItem> findByUserIdOrderByExpiryDateAsc(Long userId);
    List<FoodItem> findByDonatedTrueAndUserIdNotOrderByExpiryDateAsc(Long userId);
    Optional<FoodItem> findByIdAndUserId(Long id, Long userId);
}
