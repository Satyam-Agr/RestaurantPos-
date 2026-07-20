package com.restro.backend.dto;

import java.time.Instant;
import java.util.List;

public record WaiterPerformanceResponse(
        Instant from,
        Instant to,
        List<WaiterPerformanceEntry> waiters
) {
}
