package com.restro.backend.service;

import com.restro.backend.domain.CustomerOrder;
import com.restro.backend.domain.OrderItem;
import com.restro.backend.dto.OrderItemResponse;
import com.restro.backend.dto.OrderResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OrderMapper {

    public OrderResponse toResponse(CustomerOrder order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(this::toItemResponse)
                .toList();
        return new OrderResponse(
                order.getId(),
                order.getTableSession().getId(),
                order.getTableSession().getTable().getTableNumber(),
                order.getStatus(),
                order.getPlacedAt(),
                items
        );
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getMenuItem().getId(),
                item.getMenuItem().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getNotes(),
                item.getItemStatus()
        );
    }
}
