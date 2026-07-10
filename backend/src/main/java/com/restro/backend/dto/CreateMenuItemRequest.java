package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateMenuItemRequest(
        @NotNull Long categoryId,
        @NotBlank String name,
        String description,
        @NotNull BigDecimal price,
        String imageUrl,
        Boolean available
) {
}
