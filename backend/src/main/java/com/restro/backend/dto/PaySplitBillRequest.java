package com.restro.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;

public record PaySplitBillRequest(
        @NotEmpty List<@Valid PaymentEntryRequest> payments,
        BigDecimal tip
) {
}
