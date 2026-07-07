package com.restro.backend.dto;

import jakarta.validation.constraints.Pattern;

public record JoinSessionRequest(
        @Pattern(regexp = "\\d{4}", message = "pin must be exactly 4 digits") String pin
) {
}
