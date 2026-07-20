package com.restro.backend.dto;

import java.math.BigDecimal;
import java.time.DayOfWeek;

public record PeakHourBucket(
        DayOfWeek dayOfWeek,
        int hourOfDay,
        int billCount,
        BigDecimal revenue
) {
}
