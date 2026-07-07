package com.restro.backend.service;

import com.restro.backend.domain.ItemStatus;
import com.restro.backend.domain.OrderStatus;
import com.restro.backend.domain.StaffUser;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.repository.CustomerOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KitchenService {

    private static final List<ItemStatus> KITCHEN_ALLOWED_TARGETS = List.of(ItemStatus.PREPARING, ItemStatus.READY);

    private final CustomerOrderRepository customerOrderRepository;
    private final OrderMapper orderMapper;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public List<OrderResponse> getQueue() {
        return customerOrderRepository
                .findAllByStatusInOrderByPlacedAtAsc(List.of(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    @Transactional
    public OrderResponse updateItemStatus(Long orderItemId, ItemStatus newStatus, StaffUser kitchenStaff) {
        if (!KITCHEN_ALLOWED_TARGETS.contains(newStatus)) {
            throw new ConflictException("Kitchen can only set item status to PREPARING or READY");
        }
        return orderService.updateItemStatus(orderItemId, newStatus, kitchenStaff);
    }
}
