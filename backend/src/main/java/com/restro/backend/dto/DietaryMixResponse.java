package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record DietaryMixResponse(
        Instant from,
        Instant to,
        BigDecimal vegRevenue,
        BigDecimal nonVegRevenue,
        BigDecimal eggRevenue,
        BigDecimal untaggedRevenue,
        Double vegPercent,
        Double nonVegPercent,
        Double eggPercent
) {
}
