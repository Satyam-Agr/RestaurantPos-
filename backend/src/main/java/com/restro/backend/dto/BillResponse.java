package com.restro.backend.dto;

import com.restro.backend.domain.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BillResponse(
        Long id,
        Long tableSessionId,
        String tableNumber,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal discount,
        BigDecimal tip,
        String tipRecipientName,
        BigDecimal total,
        PaymentMethod paymentMethod,
        Instant generatedAt,
        Instant paidAt,
        Instant voidedAt,
        String voidReason,
        List<BillLineItemResponse> items,
        List<BillPaymentResponse> payments
) {
}
