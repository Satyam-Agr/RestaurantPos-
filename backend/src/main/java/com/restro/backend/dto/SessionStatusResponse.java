package com.restro.backend.dto;

public record SessionStatusResponse(
        String tableNumber,
        boolean activeSessionExists
) {
}
