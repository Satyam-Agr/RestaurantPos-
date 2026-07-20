package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record TipPoolEntryResponse(
        Long id,
        Long billId,
        Long sessionId,
        String tableNumber,
        BigDecimal amount,
        Instant recordedAt
) {
}
