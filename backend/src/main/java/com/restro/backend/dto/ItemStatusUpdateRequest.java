package com.restro.backend.dto;

import com.restro.backend.domain.ItemStatus;
import jakarta.validation.constraints.NotNull;

public record ItemStatusUpdateRequest(
        @NotNull ItemStatus itemStatus
) {
}
