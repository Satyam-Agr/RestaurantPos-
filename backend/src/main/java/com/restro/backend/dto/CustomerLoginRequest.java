package com.restro.backend.dto;

import jakarta.validation.constraints.Pattern;

public record CustomerLoginRequest(
        @Pattern(regexp = "^[6-9]\\d{9}$", message = "phoneNumber must be a valid 10-digit mobile number") String phoneNumber
) {
}
