package com.restro.backend.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateItemAvailabilityRequest(
        @NotNull Boolean available
) {
}
