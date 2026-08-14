package com.zerowaste.zerowaste.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.zerowaste.zerowaste.model.FoodActivityLog;

public interface FoodActivityLogRepository extends JpaRepository<FoodActivityLog, Long> {

    List<FoodActivityLog> findByUserIdAndTypeAndOccurredAtGreaterThanEqual(Long userId, String type, Instant since);

    List<FoodActivityLog> findByUserIdAndTypeAndOccurredAtBetween(Long userId, String type, Instant from, Instant to);

    List<FoodActivityLog> findByUserIdAndType(Long userId, String type);

    List<FoodActivityLog> findByUserIdOrderByOccurredAtDesc(Long userId);

    long countByType(String type);

    @Query("SELECT COUNT(DISTINCT f.userId) FROM FoodActivityLog f WHERE f.type = :type")
    long countDistinctUsersByType(@Param("type") String type);
}
