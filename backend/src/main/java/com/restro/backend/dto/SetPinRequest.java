package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record SetPinRequest(
        @NotBlank String currentPassword,
        @NotBlank String newPin
) {
}
