package com.zerowaste.zerowaste.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zerowaste.zerowaste.model.FoodItem;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    List<FoodItem> findByUserIdOrderByExpiryDateAsc(Long userId);

    List<FoodItem> findByDonatedTrueAndUserIdNotOrderByExpiryDateAsc(Long userId);

    List<FoodItem> findByDonatedTrueOrderByExpiryDateAsc();

    Optional<FoodItem> findByIdAndUserId(Long id, Long userId);

    // Not yet donated, not already alerted on, expiring within the window (inclusive).
    List<FoodItem> findByDonatedFalseAndExpiryAlertSentFalseAndExpiryDateBetween(LocalDate start, LocalDate end);
}
