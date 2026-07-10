package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateCategoryRequest(
        @NotBlank String pin,
        String name,
        Integer sortOrder
) {
}
