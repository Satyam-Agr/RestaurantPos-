package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RevenueSummaryResponse(
        Instant from,
        Instant to,
        BigDecimal totalRevenue,
        BigDecimal totalTax,
        BigDecimal totalDiscount,
        int billCount,
        BigDecimal averageBillValue,
        List<DailyRevenueResponse> dailyBreakdown
) {
}
