package com.restro.backend.dto;

import java.math.BigDecimal;

public record BillLineItemResponse(
        String menuItemName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String customizationSummary
) {
}
