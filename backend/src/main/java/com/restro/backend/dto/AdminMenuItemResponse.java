package com.restro.backend.dto;

import java.math.BigDecimal;

public record AdminMenuItemResponse(
        Long id,
        Long categoryId,
        String categoryName,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        boolean available
) {
}
