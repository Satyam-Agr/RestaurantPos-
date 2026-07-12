package com.restro.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record GenerateBillRequest(
        @NotNull BigDecimal taxRatePercent,
        @NotNull BigDecimal discount,
        BigDecimal tip,
        Long tipRecipientStaffId
) {
}
