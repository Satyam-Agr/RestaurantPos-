package com.restro.backend.dto;

import jakarta.validation.constraints.NotNull;

public record QuantityUpdateRequest(
        @NotNull Integer quantity
) {
}
