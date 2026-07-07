package com.restro.backend.controller;

import com.restro.backend.dto.OrderResponse;
import com.restro.backend.service.BillService;
import com.restro.backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final BillService billService;

    @GetMapping("/{orderId}")
    public OrderResponse getOrder(@PathVariable Long orderId) {
        return orderService.getOrder(orderId);
    }

    @PostMapping("/bill-request/{sessionToken}")
    public void requestBill(@PathVariable String sessionToken) {
        billService.requestBill(sessionToken);
    }
}
