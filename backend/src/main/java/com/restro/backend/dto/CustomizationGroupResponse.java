package com.restro.backend.dto;

import com.restro.backend.domain.CustomizationType;

import java.util.List;

public record CustomizationGroupResponse(
        Long id,
        String name,
        CustomizationType type,
        boolean required,
        List<CustomizationOptionResponse> options
) {
}
