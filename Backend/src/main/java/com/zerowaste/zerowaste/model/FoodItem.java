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

    private String imageUrl;

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
}