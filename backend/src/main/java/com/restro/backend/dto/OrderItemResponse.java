package com.restro.backend.dto;

import com.restro.backend.domain.ItemStatus;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long menuItemId,
        String menuItemName,
        int quantity,
        BigDecimal unitPrice,
        String notes,
        ItemStatus itemStatus
) {
}
