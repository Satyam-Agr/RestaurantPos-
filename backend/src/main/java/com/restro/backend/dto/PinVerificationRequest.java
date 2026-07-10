package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record PinVerificationRequest(
        @NotBlank String pin
) {
}
