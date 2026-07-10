package com.restro.backend.dto;

public record AdminMenuCategoryResponse(
        Long id,
        String name,
        Integer sortOrder
) {
}
