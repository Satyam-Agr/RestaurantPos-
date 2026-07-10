package com.restro.backend.dto;

import com.restro.backend.domain.OrderStatus;

import java.time.Instant;

public record OrderStatusEventResponse(
        Long orderId,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        String changedByName,
        Instant changedAt
) {
}
