package com.restro.backend.dto;

import java.time.Instant;

public record CustomerRetentionResponse(
        Instant from,
        Instant to,
        int uniqueCustomers,
        int newCustomers,
        int returningCustomers,
        Double returningRate
) {
}
