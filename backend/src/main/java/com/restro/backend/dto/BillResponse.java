package com.restro.backend.dto;

import com.restro.backend.domain.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;

public record BillResponse(
        Long id,
        Long tableSessionId,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal discount,
        BigDecimal total,
        PaymentMethod paymentMethod,
        Instant generatedAt,
        Instant paidAt
) {
}
