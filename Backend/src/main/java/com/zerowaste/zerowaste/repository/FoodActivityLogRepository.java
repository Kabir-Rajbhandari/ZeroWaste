package com.zerowaste.zerowaste.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zerowaste.zerowaste.model.FoodActivityLog;

public interface FoodActivityLogRepository extends JpaRepository<FoodActivityLog, Long> {

    List<FoodActivityLog> findByUserIdAndTypeAndOccurredAtGreaterThanEqual(Long userId, String type, Instant since);

    List<FoodActivityLog> findByUserIdAndType(Long userId, String type);

    List<FoodActivityLog> findByUserIdOrderByOccurredAtDesc(Long userId);
}
