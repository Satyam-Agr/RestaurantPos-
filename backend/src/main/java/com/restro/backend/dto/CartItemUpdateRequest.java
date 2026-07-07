package com.restro.backend.dto;

import jakarta.validation.constraints.Min;

public record CartItemUpdateRequest(
        @Min(1) Integer quantity,
        String notes
) {
}
