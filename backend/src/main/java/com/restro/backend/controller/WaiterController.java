package com.restro.backend.controller;

import com.restro.backend.dto.OrderResponse;
import com.restro.backend.dto.QuantityUpdateRequest;
import com.restro.backend.security.StaffUserDetails;
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
