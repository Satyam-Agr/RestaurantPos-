package com.restro.backend.service;

import com.restro.backend.domain.StaffUser;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.UnauthorizedException;
import com.restro.backend.repository.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final String PIN_PATTERN = "\\d{4,6}";

    private final StaffUserRepository staffUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void setPin(StaffUser admin, String currentPassword, String newPin) {
        if (!passwordEncoder.matches(currentPassword, admin.getPasswordHash())) {
            throw new UnauthorizedException("Incorrect password");
        }
        if (newPin == null || !newPin.matches(PIN_PATTERN)) {
            throw new ConflictException("PIN must be 4 to 6 digits");
        }
        admin.setPinHash(passwordEncoder.encode(newPin));
        staffUserRepository.save(admin);
    }

    // Called inline by every PIN-gated admin action — no separate "elevated session" token,
    // each sensitive action just re-checks the PIN against the request each time.
    public void verifyPin(StaffUser admin, String pin) {
        if (admin.getPinHash() == null) {
            throw new ConflictException("Set your security PIN first via PATCH /api/admin/me/pin");
        }
        if (pin == null || !passwordEncoder.matches(pin, admin.getPinHash())) {
            throw new UnauthorizedException("Incorrect PIN");
        }
    }
}
