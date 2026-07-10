package com.restro.backend.dto;

import com.restro.backend.domain.TableOverviewStatus;
import com.restro.backend.domain.TableStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AdminTableDetailResponse(
        Long tableId,
        String tableNumber,
        TableStatus tableStatus,
        TableOverviewStatus overviewStatus,
        Long sessionId,
        String pin,
        Instant openedAt,
        Integer participantCount,
        Boolean billRequested,
        BigDecimal estimatedTotal,
        List<OrderResponse> orders
) {
}
