package com.zerowaste.zerowaste.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "food_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private String quantityUnit;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    /**
     * Optional per the use case ("Storage location (optional)") — e.g. Fridge,
     * Freezer, Pantry.
     */
    @Column(name = "storage_location")
    private String storageLocation;

    /**
     * Optional free-text remarks/notes entered on the Add/Edit Food Item form.
     */
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private Long userId;

    @Builder.Default
    @Column(columnDefinition = "boolean default false")
    private Boolean donated = false;

    // Filled in by the donor when they click "Donate" on a food item (DonateModal).
    // Shown to the claimer on the Browse Food Item detail page.
    @Column(name = "pickup_location")
    private String pickupLocation;

    @Column(name = "available_time")
    private String availableTime;

    @Column(name = "contact_detail")
    private String contactDetail;

    @Builder.Default
    @Column(name = "expiry_alert_sent", columnDefinition = "boolean default false")
    private Boolean expiryAlertSent = false;

    @Builder.Default
    @Column(name = "reserved", columnDefinition = "boolean default false")
    private Boolean reserved = false;
}
