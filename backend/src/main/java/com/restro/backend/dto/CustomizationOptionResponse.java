package com.restro.backend.dto;

import java.math.BigDecimal;

public record CustomizationOptionResponse(
        Long id,
        String name,
        BigDecimal priceDelta
) {
}
