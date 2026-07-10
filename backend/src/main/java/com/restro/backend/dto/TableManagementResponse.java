package com.restro.backend.dto;

import com.restro.backend.domain.TableStatus;

public record TableManagementResponse(
        Long id,
        String tableNumber,
        String qrToken,
        TableStatus status,
        boolean retired
) {
}
