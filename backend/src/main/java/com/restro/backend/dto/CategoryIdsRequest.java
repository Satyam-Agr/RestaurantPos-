package com.restro.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CategoryIdsRequest(
        @NotBlank String pin,
        @NotEmpty List<Long> categoryIds
) {
}
