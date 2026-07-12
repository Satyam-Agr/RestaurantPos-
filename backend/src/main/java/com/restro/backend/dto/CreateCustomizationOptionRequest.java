package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateCustomizationOptionRequest(
        @NotBlank String name,
        @NotNull BigDecimal priceDelta
) {
}
