package com.restro.backend.dto;

import com.restro.backend.domain.TableOverviewStatus;
import com.restro.backend.domain.TableStatus;

import java.time.Instant;

public record TableSummaryResponse(
        Long tableId,
        String tableNumber,
        TableStatus tableStatus,
        TableOverviewStatus overviewStatus,
        Long sessionId,
        Instant openedAt,
        Integer participantCount,
        Integer ordersAwaitingConfirmation,
        Integer itemsInKitchen,
        Integer itemsReadyToServe,
        Boolean billRequested
) {
}
