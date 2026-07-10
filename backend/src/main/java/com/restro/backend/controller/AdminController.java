package com.restro.backend.controller;

import com.restro.backend.dto.AdminMeResponse;
import com.restro.backend.dto.SetPinRequest;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/me")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping
    public AdminMeResponse getMe(@AuthenticationPrincipal StaffUserDetails principal) {
        var admin = principal.staffUser();
        return new AdminMeResponse(admin.getId(), admin.getName(), admin.getUsername(), admin.getRole(), admin.getPinHash() != null);
    }

    @PatchMapping("/pin")
    public void setPin(@Valid @RequestBody SetPinRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminService.setPin(principal.staffUser(), request.currentPassword(), request.newPin());
    }
}
