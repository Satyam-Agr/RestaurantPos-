package com.restro.backend.dto;

import java.math.BigDecimal;

public record TopMenuItemResponse(
        String menuItemName,
        int quantitySold,
        BigDecimal revenue
) {
}
