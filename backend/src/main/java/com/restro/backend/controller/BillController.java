package com.restro.backend.controller;

import com.restro.backend.dto.BillResponse;
import com.restro.backend.dto.GenerateBillRequest;
import com.restro.backend.dto.PayBillRequest;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.BillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

    @GetMapping("/pending")
    public List<BillResponse> getPending() {
        return billService.getPendingBills();
    }

    @PostMapping("/{sessionId}/generate")
    public BillResponse generate(@PathVariable Long sessionId, @RequestBody(required = false) GenerateBillRequest request) {
        return billService.generateBill(sessionId, request != null ? request : new GenerateBillRequest(null, null));
    }

    @PatchMapping("/{billId}/pay")
    public BillResponse pay(
            @PathVariable Long billId,
            @Valid @RequestBody PayBillRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return billService.payBill(billId, request, principal.staffUser());
    }
}
