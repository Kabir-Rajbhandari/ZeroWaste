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

    /**
     * Items the user has moved into their Donation Listing (via "Convert to
     * Donation") but not yet finalized into a public donation (via "Convert
     * Donation" + pickup details).
     */
    List<FoodItem> findByUserIdAndListedForDonationTrueAndDonatedFalseOrderByExpiryDateAsc(Long userId);

    /**
     * Finds active food items whose expiry date falls between the supplied
     * start and end dates, inclusive.
     */
    List<FoodItem> findByDonatedFalseAndExpiryDateBetween(
            LocalDate startDate,
            LocalDate endDate
    );
}
