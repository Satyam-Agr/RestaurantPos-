package com.restro.backend.dto;

import java.math.BigDecimal;

public record StaffBreakdownEntry(
        String staffName,
        int count,
        BigDecimal totalAmount
) {
}
