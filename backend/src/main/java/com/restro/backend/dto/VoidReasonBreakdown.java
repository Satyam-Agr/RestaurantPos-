package com.restro.backend.dto;

import java.math.BigDecimal;

public record VoidReasonBreakdown(
        String reason,
        int count,
        BigDecimal totalAmount
) {
}
