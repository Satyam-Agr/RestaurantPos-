package com.restro.backend.controller;

import com.restro.backend.dto.CreateStaffBatchRequest;
import com.restro.backend.dto.StaffIdsRequest;
import com.restro.backend.dto.StaffResponse;
import com.restro.backend.dto.UpdateStaffRequest;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.AdminStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
public class AdminStaffController {

    private final AdminStaffService adminStaffService;

    @GetMapping
    public List<StaffResponse> getAllStaff() {
        return adminStaffService.getAllStaff();
    }

    @PostMapping
    public List<StaffResponse> createStaff(
            @Valid @RequestBody CreateStaffBatchRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminStaffService.createStaff(request, principal.staffUser());
    }

    @PatchMapping("/{staffId}")
    public StaffResponse updateStaff(
            @PathVariable Long staffId,
            @Valid @RequestBody UpdateStaffRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminStaffService.updateStaff(staffId, request, principal.staffUser());
    }

    @PostMapping("/activate")
    public void activateStaff(@Valid @RequestBody StaffIdsRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminStaffService.activateStaff(request, principal.staffUser());
    }

    @PostMapping("/deactivate")
    public void deactivateStaff(@Valid @RequestBody StaffIdsRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminStaffService.deactivateStaff(request, principal.staffUser());
    }
}
