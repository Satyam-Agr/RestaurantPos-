package com.restro.backend.service;

import com.restro.backend.domain.CustomerOrder;
import com.restro.backend.domain.OrderItem;
import com.restro.backend.dto.OrderItemResponse;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.dto.SelectedOptionResponse;
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

    // Staff can annotate an item via PATCH /api/waiter/order-items/{itemId}/note — that note is for staff
    // eyes only. Every customer-facing endpoint/broadcast must go through this instead of toResponse().
    public OrderResponse toCustomerResponse(CustomerOrder order) {
        OrderResponse full = toResponse(order);
        List<OrderItemResponse> sanitized = full.items().stream()
                .map(i -> new OrderItemResponse(i.id(), i.menuItemId(), i.menuItemName(), i.quantity(), i.unitPrice(), null, i.itemStatus(), i.selectedOptions()))
                .toList();
        return new OrderResponse(full.id(), full.tableSessionId(), full.tableNumber(), full.status(), full.placedAt(), sanitized);
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        List<SelectedOptionResponse> selectedOptions = item.getSelectedOptions().stream()
                .map(o -> new SelectedOptionResponse(o.getGroupName(), o.getOptionName(), o.getPriceDelta()))
                .toList();
        return new OrderItemResponse(
                item.getId(),
                item.getMenuItem().getId(),
                item.getMenuItem().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getNotes(),
                item.getItemStatus(),
                selectedOptions
        );
    }
}
