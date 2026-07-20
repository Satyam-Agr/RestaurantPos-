package com.restro.backend.controller;

import com.restro.backend.dto.AdminTableDetailResponse;
import com.restro.backend.dto.BillResponse;
import com.restro.backend.dto.CreateTablesBatchRequest;
import com.restro.backend.dto.OrderStatusEventResponse;
import com.restro.backend.dto.ParticipantResponse;
import com.restro.backend.dto.PinVerificationRequest;
import com.restro.backend.dto.TableIdsRequest;
import com.restro.backend.dto.TableManagementResponse;
import com.restro.backend.dto.TableSummaryResponse;
import com.restro.backend.dto.TipPoolEntryResponse;
import com.restro.backend.dto.UpdateTableRequest;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.AdminTableService;
import com.restro.backend.service.TableOverviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminTableController {

    private final TableOverviewService tableOverviewService;
    private final AdminTableService adminTableService;

    @GetMapping("/tables")
    public List<TableSummaryResponse> getTables() {
        return tableOverviewService.getAllTableSummaries();
    }

    @GetMapping("/tables/{tableId}")
    public AdminTableDetailResponse getTable(@PathVariable Long tableId) {
        return tableOverviewService.getAdminDetail(tableId);
    }

    @GetMapping("/tables/roster")
    public List<TableManagementResponse> getRoster() {
        return adminTableService.getRoster();
    }

    @PostMapping("/tables")
    public List<TableManagementResponse> createTables(
            @Valid @RequestBody CreateTablesBatchRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminTableService.createTables(request, principal.staffUser());
    }

    @PatchMapping("/tables/{tableId}")
    public TableManagementResponse renameTable(
            @PathVariable Long tableId,
            @Valid @RequestBody UpdateTableRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminTableService.renameTable(tableId, request, principal.staffUser());
    }

    @PostMapping("/tables/retire")
    public void retireTables(@Valid @RequestBody TableIdsRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminTableService.retireTables(request, principal.staffUser());
    }

    @PostMapping("/tables/reactivate")
    public void reactivateTables(@Valid @RequestBody TableIdsRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminTableService.reactivateTables(request, principal.staffUser());
    }

    @PostMapping("/tables/{tableId}/free-session")
    public void freeSession(
            @PathVariable Long tableId,
            @Valid @RequestBody PinVerificationRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        adminTableService.freeSession(tableId, request.pin(), principal.staffUser());
    }

    @PostMapping("/tables/{tableId}/reveal-participants")
    public List<ParticipantResponse> revealParticipants(
            @PathVariable Long tableId,
            @Valid @RequestBody PinVerificationRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminTableService.revealParticipants(tableId, request.pin(), principal.staffUser());
    }

    @GetMapping("/orders/{orderId}/history")
    public List<OrderStatusEventResponse> getOrderHistory(@PathVariable Long orderId) {
        return adminTableService.getOrderHistory(orderId);
    }

    @GetMapping("/bills")
    public List<BillResponse> getBillHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminTableService.getBillHistory(from, to);
    }

    @GetMapping("/tip-pool")
    public List<TipPoolEntryResponse> getTipPool(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminTableService.getTipPool(from, to);
    }
}
