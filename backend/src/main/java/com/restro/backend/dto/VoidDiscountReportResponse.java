package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record VoidDiscountReportResponse(
        Instant from,
        Instant to,
        BigDecimal totalVoidedAmount,
        int voidCount,
        List<VoidReasonBreakdown> voidsByReason,
        List<StaffBreakdownEntry> voidsByStaff,
        BigDecimal totalDiscountGiven,
        int discountCount,
        BigDecimal discountAsPercentOfRevenue
) {
}
