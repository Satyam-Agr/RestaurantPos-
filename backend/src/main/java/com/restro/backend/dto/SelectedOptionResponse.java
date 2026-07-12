package com.restro.backend.dto;

import java.math.BigDecimal;

public record SelectedOptionResponse(
        String groupName,
        String optionName,
        BigDecimal priceDelta
) {
}
