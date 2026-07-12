package com.restro.backend.dto;

import com.restro.backend.domain.DietaryType;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record UpdateMenuItemRequest(
        @NotBlank String pin,
        Long categoryId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        DietaryType dietaryType,
        String allergens
) {
}
