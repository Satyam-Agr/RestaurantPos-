package com.restro.backend.dto;

public record CashierNotice(
        String event,
        Long tableSessionId,
        String tableNumber,
        BillResponse bill
) {
}
