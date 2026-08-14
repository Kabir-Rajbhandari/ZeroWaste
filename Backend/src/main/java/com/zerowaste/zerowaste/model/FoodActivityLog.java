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

/**
 * A permanent record of something that happened to a food item, kept even
 * after the FoodItem row itself is deleted or changes owner. This is what
 * the Analytics page's counts and charts are computed from — the current
 * state of the food_items table alone can't answer "how many items has this
 * user used/donated/wasted this month", since donated items change owner
 * and used/wasted items get deleted outright.
 */
@Entity
@Table(name = "food_activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    // ADDED, UPDATED, USED, DONATED, WASTED, REMOVED, REQUESTED
    @Column(nullable = false)
    private String type;

    // Snapshot of the item's category at the time of the event (Dairy, Meat,
    // Fruits, Vegetable), so charts can break totals down by category even
    // after the original FoodItem row is gone.
    private String category;

    // Snapshot of the item's name at the time of the event, so the Recent
    // Activity feed can say "Added Milk" instead of just "Added an item" —
    // kept even after the FoodItem row itself is gone (deleted/transferred).
    private String itemName;

    private Double quantity;

    @Column(nullable = false)
    private Instant occurredAt;

    @PrePersist
    public void prePersist() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }
}