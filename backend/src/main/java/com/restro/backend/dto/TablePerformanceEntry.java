package com.restro.backend.dto;

import java.math.BigDecimal;

public record TablePerformanceEntry(
        String tableNumber,
        int sessionCount,
        Double avgSessionDurationMinutes,
        BigDecimal revenue
) {
}
