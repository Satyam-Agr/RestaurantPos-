package com.restro.backend.controller;

import com.restro.backend.dto.CartItemUpdateRequest;
import com.restro.backend.dto.OrderItemRequest;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping("/{sessionToken}")
    public OrderResponse getCart(@PathVariable String sessionToken) {
        return cartService.getCart(sessionToken);
    }

    @PostMapping("/{sessionToken}/items")
    public OrderResponse addItem(@PathVariable String sessionToken, @Valid @RequestBody OrderItemRequest request) {
        return cartService.addItem(sessionToken, request);
    }

    @PatchMapping("/{sessionToken}/items/{itemId}")
    public OrderResponse updateItem(
            @PathVariable String sessionToken,
            @PathVariable Long itemId,
            @Valid @RequestBody CartItemUpdateRequest request
    ) {
        return cartService.updateItem(sessionToken, itemId, request);
    }

    @DeleteMapping("/{sessionToken}/items/{itemId}")
    public OrderResponse removeItem(@PathVariable String sessionToken, @PathVariable Long itemId) {
        return cartService.removeItem(sessionToken, itemId);
    }

    @PostMapping("/{sessionToken}/submit")
    public OrderResponse submit(@PathVariable String sessionToken) {
        return cartService.submit(sessionToken);
    }
}
