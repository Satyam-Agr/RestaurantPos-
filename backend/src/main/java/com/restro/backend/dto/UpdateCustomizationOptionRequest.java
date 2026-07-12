package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record UpdateCustomizationOptionRequest(
        @NotBlank String pin,
        String name,
        BigDecimal priceDelta
) {
}
