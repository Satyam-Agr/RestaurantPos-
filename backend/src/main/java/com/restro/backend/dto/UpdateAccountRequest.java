package com.restro.backend.dto;

public record UpdateAccountRequest(
        String name,
        String username,
        String email,
        String contactNumber,
        String address
) {
}
