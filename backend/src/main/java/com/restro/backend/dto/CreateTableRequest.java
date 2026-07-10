package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTableRequest(
        @NotBlank String tableNumber
) {
}
