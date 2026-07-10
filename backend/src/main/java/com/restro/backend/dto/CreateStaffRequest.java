package com.restro.backend.dto;

import com.restro.backend.domain.StaffRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateStaffRequest(
        @NotBlank String name,
        @NotBlank String username,
        @NotBlank String password,
        @NotNull StaffRole role,
        String email,
        String contactNumber,
        String address
) {
}
