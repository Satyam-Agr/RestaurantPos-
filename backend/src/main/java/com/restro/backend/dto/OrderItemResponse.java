package com.restro.backend.dto;

import com.restro.backend.domain.ItemStatus;

import java.math.BigDecimal;
import java.util.List;

public record OrderItemResponse(
        Long id,
        Long menuItemId,
        String menuItemName,
        int quantity,
        BigDecimal unitPrice,
        String notes,
        ItemStatus itemStatus,
        List<SelectedOptionResponse> selectedOptions
) {
}
