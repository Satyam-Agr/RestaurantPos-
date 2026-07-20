package com.restro.backend.dto;

import com.restro.backend.domain.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PayBillRequest(
        @NotNull PaymentMethod paymentMethod,
        BigDecimal tip
) {
}
