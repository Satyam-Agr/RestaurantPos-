package com.restro.backend.service;

import com.restro.backend.domain.StaffUser;
import com.restro.backend.dto.StaffAccountResponse;
import com.restro.backend.dto.UpdateAccountRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.UnauthorizedException;
import com.restro.backend.repository.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StaffAccountService {

    private final StaffUserRepository staffUserRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffAccountResponse toResponse(StaffUser staff) {
        return new StaffAccountResponse(staff.getId(), staff.getName(), staff.getUsername(), staff.getRole(),
                staff.getEmail(), staff.getContactNumber(), staff.getAddress());
    }

    @Transactional
    public StaffAccountResponse updateMyAccount(StaffUser staff, UpdateAccountRequest request) {
        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw new ConflictException("Full name can't be blank");
            }
            staff.setName(request.name());
        }
        if (request.username() != null) {
            if (request.username().isBlank()) {
                throw new ConflictException("Username can't be blank");
            }
            staffUserRepository.findByUsername(request.username())
                    .filter(existing -> !existing.getId().equals(staff.getId()))
                    .ifPresent(existing -> {
                        throw new ConflictException("Username '" + request.username() + "' is already taken");
                    });
            staff.setUsername(request.username());
        }
        if (request.email() != null) {
            staff.setEmail(request.email().isBlank() ? null : request.email());
        }
        if (request.contactNumber() != null) {
            staff.setContactNumber(request.contactNumber().isBlank() ? null : request.contactNumber());
        }
        if (request.address() != null) {
            staff.setAddress(request.address().isBlank() ? null : request.address());
        }
        return toResponse(staffUserRepository.save(staff));
    }

    @Transactional
    public void changePassword(StaffUser staff, String currentPassword, String newPassword) {
        if (!passwordEncoder.matches(currentPassword, staff.getPasswordHash())) {
            throw new UnauthorizedException("Incorrect current password");
        }
        staff.setPasswordHash(passwordEncoder.encode(newPassword));
        staffUserRepository.save(staff);
    }
}
