package com.restro.backend.dto;

import com.restro.backend.domain.CustomizationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateCustomizationGroupRequest(
        @NotBlank String name,
        @NotNull CustomizationType type,
        boolean required,
        @NotEmpty List<@Valid CreateCustomizationOptionRequest> options
) {
}
