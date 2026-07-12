package com.restro.backend.dto;

import com.restro.backend.domain.TableOverviewStatus;
import com.restro.backend.domain.TableStatus;

import java.time.Instant;
import java.util.List;

public record KitchenTableDetailResponse(
        Long tableId,
        String tableNumber,
        TableStatus tableStatus,
        TableOverviewStatus overviewStatus,
        Long sessionId,
        Instant openedAt,
        Integer participantCount,
        Boolean billRequested,
        String note,
        List<OrderResponse> orders
) {
}
