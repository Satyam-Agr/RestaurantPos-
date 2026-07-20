package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyTipBreakdown(
        LocalDate date,
        BigDecimal totalTips,
        int entryCount
) {
}
