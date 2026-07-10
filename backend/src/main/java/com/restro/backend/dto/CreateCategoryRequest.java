package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCategoryRequest(
        @NotBlank String name,
        Integer sortOrder
) {
}
