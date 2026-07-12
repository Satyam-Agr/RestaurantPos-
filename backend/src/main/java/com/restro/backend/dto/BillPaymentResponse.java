package com.restro.backend.dto;

import com.restro.backend.domain.PaymentMethod;

import java.math.BigDecimal;

public record BillPaymentResponse(
        PaymentMethod paymentMethod,
        BigDecimal amount
) {
}
