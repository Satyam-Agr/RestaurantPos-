package com.restro.backend.dto;

import java.math.BigDecimal;

public record GenerateBillRequest(
        BigDecimal taxRatePercent,
        BigDecimal discount
) {
}
