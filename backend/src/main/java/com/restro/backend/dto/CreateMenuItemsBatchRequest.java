package com.restro.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateMenuItemsBatchRequest(
        @NotBlank String pin,
        @NotEmpty List<@Valid CreateMenuItemRequest> items
) {
}
