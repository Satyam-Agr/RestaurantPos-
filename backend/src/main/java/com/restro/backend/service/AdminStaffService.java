package com.restro.backend.service;

import com.restro.backend.domain.StaffUser;
import com.restro.backend.dto.CreateStaffBatchRequest;
import com.restro.backend.dto.CreateStaffRequest;
import com.restro.backend.dto.StaffIdsRequest;
import com.restro.backend.dto.StaffResponse;
import com.restro.backend.dto.UpdateStaffRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminStaffService {

    private final StaffUserRepository staffUserRepository;
    private final AdminService adminService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<StaffResponse> getAllStaff() {
        return staffUserRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<StaffResponse> createStaff(CreateStaffBatchRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());

        Set<String> usernamesInBatch = new HashSet<>();
        for (CreateStaffRequest entry : request.staff()) {
            if (!usernamesInBatch.add(entry.username())) {
                throw new ConflictException("Username '" + entry.username() + "' appears more than once in this batch");
            }
            if (staffUserRepository.findByUsername(entry.username()).isPresent()) {
                throw new ConflictException("Username '" + entry.username() + "' is already taken");
            }
        }

        List<StaffUser> created = request.staff().stream()
                .map(entry -> StaffUser.builder()
                        .name(entry.name())
                        .username(entry.username())
                        .passwordHash(passwordEncoder.encode(entry.password()))
                        .role(entry.role())
                        .active(true)
                        .email(entry.email())
                        .contactNumber(entry.contactNumber())
                        .address(entry.address())
                        .build())
                .map(staffUserRepository::save)
                .toList();

        return created.stream().map(this::toResponse).toList();
    }

    @Transactional
    public StaffResponse updateStaff(Long staffId, UpdateStaffRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        StaffUser staff = requireStaff(staffId);

        if (request.role() != null) {
            staff.setRole(request.role());
        }
        return toResponse(staffUserRepository.save(staff));
    }

    @Transactional
    public void activateStaff(StaffIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        List<StaffUser> staff = requireAllStaff(request.staffIds());
        staff.forEach(s -> s.setActive(true));
        staffUserRepository.saveAll(staff);
    }

    @Transactional
    public void deactivateStaff(StaffIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        if (request.staffIds().contains(actingAdmin.getId())) {
            throw new ConflictException("You can't deactivate your own account — remove it from this batch");
        }
        List<StaffUser> staff = requireAllStaff(request.staffIds());
        staff.forEach(s -> s.setActive(false));
        staffUserRepository.saveAll(staff);
    }

    private List<StaffUser> requireAllStaff(List<Long> staffIds) {
        return staffIds.stream().map(this::requireStaff).toList();
    }

    private StaffUser requireStaff(Long staffId) {
        return staffUserRepository.findById(staffId)
                .orElseThrow(() -> new NotFoundException("Staff member " + staffId + " not found"));
    }

    private StaffResponse toResponse(StaffUser staff) {
        return new StaffResponse(staff.getId(), staff.getName(), staff.getUsername(), staff.getRole(), staff.isActive(),
                staff.getEmail(), staff.getContactNumber(), staff.getAddress());
    }
}
