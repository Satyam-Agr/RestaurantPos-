package com.restro.backend.dto;

import com.restro.backend.domain.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PaymentEntryRequest(
        @NotNull PaymentMethod paymentMethod,
        @NotNull BigDecimal amount
) {
}
