package com.restro.backend.dto;

import com.restro.backend.domain.DietaryType;

import java.math.BigDecimal;
import java.util.List;

public record AdminMenuItemResponse(
        Long id,
        Long categoryId,
        String categoryName,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        boolean available,
        DietaryType dietaryType,
        String allergens,
        List<CustomizationGroupResponse> customizationGroups
) {
}
