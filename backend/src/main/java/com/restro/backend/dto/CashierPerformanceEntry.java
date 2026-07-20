package com.restro.backend.dto;

import java.math.BigDecimal;

public record CashierPerformanceEntry(
        Long staffId,
        String staffName,
        int billsClosed,
        BigDecimal avgBillValue,
        int voidsIssued,
        BigDecimal totalVoidedAmount
) {
}
