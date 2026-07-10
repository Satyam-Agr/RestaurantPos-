package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTableRequest(
        @NotBlank String pin,
        @NotBlank String tableNumber
) {
}
