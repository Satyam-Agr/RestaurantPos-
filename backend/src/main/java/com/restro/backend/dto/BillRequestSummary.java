package com.restro.backend.dto;

import java.util.List;

public record BillRequestSummary(
        Long tableSessionId,
        String tableNumber,
        List<OrderResponse> orders
) {
}
