package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record VoidBillRequest(
        @NotBlank String reason
) {
}
