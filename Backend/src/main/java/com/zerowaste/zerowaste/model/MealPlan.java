package com.zerowaste.zerowaste.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

// NOTE: (user_id, meal_date, meal_type) used to carry a unique constraint,
// limiting a slot (e.g. "Wed Breakfast") to exactly one planned meal. That's
// been removed so a slot can hold multiple entries — e.g. two different
// leftover items both earmarked for the same lunch. Each row is still its
// own independently editable/deletable meal entry; several rows simply now
// share the same (user_id, meal_date, meal_type).
@Entity
@Table(name = "meal_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "meal_date", nullable = false)
    private LocalDate mealDate;

    // Breakfast, Lunch, Dinner, Snacks — matches MEAL_TYPES on the frontend.
    @Column(name = "meal_type", nullable = false)
    private String mealType;

    @Column(nullable = false)
    private String name;

    // Nullable: a planned meal doesn't have to reference inventory.
    @Column(name = "linked_food_item_id")
    private Long linkedFoodItemId;

    @Builder.Default
    @Column(name = "reminder_sent", nullable = false)
    private Boolean reminderSent = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
