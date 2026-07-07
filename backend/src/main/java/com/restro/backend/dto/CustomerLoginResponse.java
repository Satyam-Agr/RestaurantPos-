package com.restro.backend.dto;

public record CustomerLoginResponse(
        String customerToken,
        Long customerId,
        String phoneNumber
) {
}
