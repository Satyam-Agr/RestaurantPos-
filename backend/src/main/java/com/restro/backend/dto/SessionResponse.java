package com.restro.backend.dto;

public record SessionResponse(
        Long sessionId,
        String sessionToken,
        String tableNumber,
        String pin
) {
}
