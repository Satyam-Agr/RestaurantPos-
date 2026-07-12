package com.restro.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record OrderItemRequest(
        @NotNull Long menuItemId,
        @Min(1) int quantity,
        List<Long> selectedOptionIds
) {
}
