package com.restro.backend.service;

import com.restro.backend.domain.ItemStatus;
import com.restro.backend.domain.OrderStatus;
import com.restro.backend.domain.StaffUser;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.repository.CustomerOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WaiterService {

    private final CustomerOrderRepository customerOrderRepository;
    private final OrderMapper orderMapper;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersAwaitingConfirmation() {
        return customerOrderRepository.findAllByStatusOrderByPlacedAtAsc(OrderStatus.PLACED).stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersReadyToServe() {
        return customerOrderRepository.findAllByStatusInOrderByPlacedAtAsc(List.of(OrderStatus.READY)).stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId, StaffUser waiter) {
        return orderService.confirmOrder(orderId, waiter);
    }

    @Transactional
    public OrderResponse markItemServed(Long orderItemId, StaffUser waiter) {
        return orderService.updateItemStatus(orderItemId, ItemStatus.SERVED, waiter);
    }

    @Transactional
    public OrderResponse removeItem(Long orderItemId, StaffUser waiter) {
        return orderService.removeItemBeforeConfirm(orderItemId, waiter);
    }

    @Transactional
    public OrderResponse updateItemQuantity(Long orderItemId, int quantity, StaffUser waiter) {
        return orderService.updateItemQuantity(orderItemId, quantity, waiter);
    }
}
