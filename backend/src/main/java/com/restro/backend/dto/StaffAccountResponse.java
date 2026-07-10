package com.restro.backend.dto;

import com.restro.backend.domain.StaffRole;

public record StaffAccountResponse(
        Long staffId,
        String name,
        String username,
        StaffRole role,
        String email,
        String contactNumber,
        String address
) {
}
