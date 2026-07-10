package com.restro.backend.dto;

import java.time.Instant;

public record OperationalTimingResponse(
        Instant from,
        Instant to,
        Double averageTimeToConfirmSeconds,
        Double averageTimeToServeSeconds,
        int ordersSampled
) {
}
