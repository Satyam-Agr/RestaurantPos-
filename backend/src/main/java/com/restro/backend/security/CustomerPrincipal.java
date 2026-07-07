package com.restro.backend.security;

public record CustomerPrincipal(
        Long customerId,
        String phoneNumber
) {
}
