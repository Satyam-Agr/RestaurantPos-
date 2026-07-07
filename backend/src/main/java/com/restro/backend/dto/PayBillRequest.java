package com.restro.backend.dto;

import com.restro.backend.domain.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PayBillRequest(
        @NotNull PaymentMethod paymentMethod
) {
}
