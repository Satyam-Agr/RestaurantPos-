package com.restro.backend.controller;

import com.restro.backend.dto.ItemStatusUpdateRequest;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.KitchenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kitchen")
@RequiredArgsConstructor
public class KitchenController {

    private final KitchenService kitchenService;

    @GetMapping("/queue")
    public List<OrderResponse> getQueue() {
        return kitchenService.getQueue();
    }

    @PatchMapping("/order-items/{itemId}/status")
    public OrderResponse updateItemStatus(
            @PathVariable Long itemId,
            @Valid @RequestBody ItemStatusUpdateRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return kitchenService.updateItemStatus(itemId, request.itemStatus(), principal.staffUser());
    }
}
