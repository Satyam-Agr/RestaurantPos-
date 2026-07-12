package com.restro.backend.dto;

import com.restro.backend.domain.CustomizationType;
import jakarta.validation.constraints.NotBlank;

public record UpdateCustomizationGroupRequest(
        @NotBlank String pin,
        String name,
        CustomizationType type,
        Boolean required
) {
}
