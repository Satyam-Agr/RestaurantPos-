package com.restro.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record PaySplitBillRequest(
        @NotEmpty List<@Valid PaymentEntryRequest> payments
) {
}
