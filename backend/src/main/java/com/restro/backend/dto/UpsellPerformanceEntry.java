package com.restro.backend.dto;

import java.math.BigDecimal;

public record UpsellPerformanceEntry(
        String optionName,
        int timesSelected,
        BigDecimal totalRevenue
) {
}
