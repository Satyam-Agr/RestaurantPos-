package com.restro.backend.dto;

import com.restro.backend.domain.StaffRole;

public record StaffResponse(
        Long id,
        String name,
        String username,
        StaffRole role,
        boolean active,
        String email,
        String contactNumber,
        String address
) {
}
