package com.restro.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record QuantityUpdateRequest(
        @NotNull @Min(1) Integer quantity
) {
}
