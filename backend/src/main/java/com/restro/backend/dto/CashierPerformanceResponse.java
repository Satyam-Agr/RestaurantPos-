package com.restro.backend.dto;

import java.time.Instant;
import java.util.List;

public record CashierPerformanceResponse(
        Instant from,
        Instant to,
        List<CashierPerformanceEntry> cashiers
) {
}
