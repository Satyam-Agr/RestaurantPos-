package com.restro.backend.controller;

import com.restro.backend.dto.ChangePasswordRequest;
import com.restro.backend.dto.StaffAccountResponse;
import com.restro.backend.dto.UpdateAccountRequest;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.StaffAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/me")
@RequiredArgsConstructor
public class StaffAccountController {

    private final StaffAccountService staffAccountService;

    @GetMapping
    public StaffAccountResponse getMyAccount(@AuthenticationPrincipal StaffUserDetails principal) {
        return staffAccountService.toResponse(principal.staffUser());
    }

    @PatchMapping
    public StaffAccountResponse updateMyAccount(
            @RequestBody UpdateAccountRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return staffAccountService.updateMyAccount(principal.staffUser(), request);
    }

    @PatchMapping("/password")
    public void changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        staffAccountService.changePassword(principal.staffUser(), request.currentPassword(), request.newPassword());
    }
}
