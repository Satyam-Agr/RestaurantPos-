package com.restro.backend.dto;

import com.restro.backend.domain.StaffRole;

public record AdminMeResponse(
        Long staffId,
        String name,
        String username,
        StaffRole role,
        boolean pinSet
) {
}
