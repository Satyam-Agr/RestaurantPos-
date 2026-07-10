package com.restro.backend.dto;

import java.time.Instant;

public record ParticipantResponse(
        Long customerId,
        String phoneNumber,
        Instant joinedAt,
        Instant leftAt,
        boolean isCreator
) {
}
