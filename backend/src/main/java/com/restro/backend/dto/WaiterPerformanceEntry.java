package com.restro.backend.dto;

public record WaiterPerformanceEntry(
        Long staffId,
        String staffName,
        int ordersConfirmed,
        Double avgConfirmSeconds,
        int ordersServed,
        Double avgServeSeconds
) {
}
