package com.restro.backend.controller;

import com.restro.backend.dto.OrderResponse;
import com.restro.backend.dto.QuantityUpdateRequest;
import com.restro.backend.dto.SessionResponse;
import com.restro.backend.dto.SetItemNoteRequest;
import com.restro.backend.dto.SetTableNoteRequest;
import com.restro.backend.dto.StaffOrderRequest;
import com.restro.backend.dto.TableSummaryResponse;
import com.restro.backend.dto.WaiterTableDetailResponse;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.BillService;
import com.restro.backend.service.OrderService;
import com.restro.backend.service.SessionService;
import com.restro.backend.service.TableOverviewService;
import com.restro.backend.service.WaiterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/waiter")
@RequiredArgsConstructor
public class WaiterController {

    private final WaiterService waiterService;
    private final TableOverviewService tableOverviewService;
    private final BillService billService;
    private final SessionService sessionService;
    private final OrderService orderService;

    @GetMapping("/tables")
    public List<TableSummaryResponse> getTables() {
        return tableOverviewService.getAllTableSummaries();
    }

    @GetMapping("/tables/{tableId}")
    public WaiterTableDetailResponse getTable(@PathVariable Long tableId) {
        return tableOverviewService.getWaiterDetail(tableId);
    }

    @PostMapping("/tables/{tableId}/request-bill")
    public void requestBill(@PathVariable Long tableId) {
        billService.requestBillForTable(tableId);
    }

    @PostMapping("/tables/{tableId}/session")
    public SessionResponse startSession(@PathVariable Long tableId) {
        return sessionService.createStaffSession(tableId);
    }

    @PatchMapping("/tables/{tableId}/note")
    public void setTableNote(@PathVariable Long tableId, @RequestBody SetTableNoteRequest request) {
        sessionService.setTableNote(tableId, request.note());
    }

    @PostMapping("/tables/{tableId}/orders")
    public OrderResponse placeOrder(
            @PathVariable Long tableId,
            @Valid @RequestBody StaffOrderRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return orderService.createStaffOrder(tableId, request.items(), principal.staffUser());
    }

    @GetMapping("/orders/pending")
    public List<OrderResponse> getPending() {
        return waiterService.getOrdersAwaitingConfirmation();
    }

    @GetMapping("/orders/ready-to-serve")
    public List<OrderResponse> getReadyToServe() {
        return waiterService.getOrdersReadyToServe();
    }

    @PatchMapping("/orders/{orderId}/confirm")
    public OrderResponse confirm(@PathVariable Long orderId, @AuthenticationPrincipal StaffUserDetails principal) {
        return waiterService.confirmOrder(orderId, principal.staffUser());
    }

    @PatchMapping("/order-items/{itemId}/serve")
    public OrderResponse markServed(@PathVariable Long itemId, @AuthenticationPrincipal StaffUserDetails principal) {
        return waiterService.markItemServed(itemId, principal.staffUser());
    }

    @PatchMapping("/order-items/{itemId}/note")
    public OrderResponse setItemNote(
            @PathVariable Long itemId,
            @RequestBody SetItemNoteRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return orderService.setItemNote(itemId, request.note(), principal.staffUser());
    }

    @DeleteMapping("/orders/{orderId}/items/{itemId}")
    public OrderResponse removeItem(
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return waiterService.removeItem(itemId, principal.staffUser());
    }

    @PatchMapping("/orders/{orderId}/items/{itemId}")
    public OrderResponse updateItemQuantity(
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @Valid @RequestBody QuantityUpdateRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return waiterService.updateItemQuantity(itemId, request.quantity(), principal.staffUser());
    }
}
