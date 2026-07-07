package com.restro.backend.dto;

import com.restro.backend.domain.StaffRole;

public record LoginResponse(
        String token,
        String name,
        StaffRole role
) {
}
