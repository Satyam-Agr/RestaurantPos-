package com.restro.backend.dto;

import com.restro.backend.domain.OrderStatus;

import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        Long tableSessionId,
        String tableNumber,
        OrderStatus status,
        Instant placedAt,
        List<OrderItemResponse> items
) {
}
