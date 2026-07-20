package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record TipSummaryResponse(
        Instant from,
        Instant to,
        BigDecimal totalTips,
        int entryCount,
        List<DailyTipBreakdown> dailyBreakdown
) {
}
