package com.restro.backend.dto;

import com.restro.backend.domain.StaffRole;
import jakarta.validation.constraints.NotBlank;

public record UpdateStaffRequest(
        @NotBlank String pin,
        StaffRole role
) {
}
