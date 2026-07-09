package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.OrderItemRequest;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.CustomerOrderRepository;
import com.restro.backend.repository.MenuItemRepository;
import com.restro.backend.repository.OrderItemRepository;
import com.restro.backend.repository.OrderStatusEventRepository;
import com.restro.backend.repository.RestaurantTableRepository;
import com.restro.backend.repository.TableSessionRepository;
import com.restro.backend.ws.OrderEventBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final CustomerOrderRepository customerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusEventRepository orderStatusEventRepository;
    private final RestaurantTableRepository restaurantTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableOverviewService tableOverviewService;
    private final OrderMapper orderMapper;
    private final OrderEventBroadcaster broadcaster;

    private static final List<ItemStatus> FORWARD_ITEM_STATUSES =
            List.of(ItemStatus.PENDING, ItemStatus.CONFIRMED, ItemStatus.PREPARING, ItemStatus.READY, ItemStatus.SERVED);
    private static final List<OrderStatus> KITCHEN_VISIBLE_STATUSES =
            List.of(OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY);

    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long orderId) {
        return orderMapper.toResponse(getOrderEntity(orderId));
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId, StaffUser waiter) {
        CustomerOrder order = getOrderEntity(orderId);
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new ConflictException("Order " + orderId + " is not awaiting confirmation (status: " + order.getStatus() + ")");
        }

        order.setStatus(OrderStatus.CONFIRMED);
        order.setConfirmedBy(waiter);
        order.setConfirmedAt(Instant.now());
        order.getItems().stream()
                .filter(item -> item.getItemStatus() != ItemStatus.CANCELLED)
                .forEach(item -> item.setItemStatus(ItemStatus.CONFIRMED));
        customerOrderRepository.save(order);
        logEvent(order, OrderStatus.PLACED, OrderStatus.CONFIRMED, waiter);

        OrderResponse response = orderMapper.toResponse(order);
        broadcaster.notifyKitchen(response);
        broadcaster.notifyTable(order.getTableSession().getId(), response);
        tableOverviewService.refreshAndBroadcast(order.getTableSession());
        return response;
    }

    // A waiter taking a verbal/walk-in order on a customer's behalf. Unlike the customer cart flow, this
    // skips CART -> PLACED -> confirm entirely: the order lands straight in CONFIRMED and goes straight to
    // the kitchen, since the waiter entering it has already effectively confirmed it themselves.
    @Transactional
    public OrderResponse createStaffOrder(Long tableId, List<OrderItemRequest> itemRequests, StaffUser waiter) {
        RestaurantTable table = restaurantTableRepository.findById(tableId)
                .orElseThrow(() -> new NotFoundException("Table " + tableId + " not found"));
        TableSession session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("No active session for this table — start one first"));

        if (customerOrderRepository.existsByTableSessionAndStatus(session, OrderStatus.BILL_REQUESTED)) {
            throw new ConflictException("The bill has already been requested for this table — no further changes are allowed");
        }

        CustomerOrder order = CustomerOrder.builder()
                .tableSession(session)
                .status(OrderStatus.CONFIRMED)
                .placedAt(Instant.now())
                .confirmedBy(waiter)
                .confirmedAt(Instant.now())
                .build();

        for (OrderItemRequest itemRequest : itemRequests) {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new NotFoundException("Menu item " + itemRequest.menuItemId() + " not found"));
            if (!menuItem.isAvailable()) {
                throw new ConflictException("Menu item '" + menuItem.getName() + "' is currently unavailable");
            }
            order.getItems().add(OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemRequest.quantity())
                    .unitPrice(menuItem.getPrice())
                    .notes(itemRequest.notes())
                    .itemStatus(ItemStatus.CONFIRMED)
                    .build());
        }

        customerOrderRepository.save(order);
        logEvent(order, null, OrderStatus.CONFIRMED, waiter);

        OrderResponse response = orderMapper.toResponse(order);
        broadcaster.notifyKitchen(response);
        broadcaster.notifyTable(session.getId(), response);
        tableOverviewService.refreshAndBroadcast(session);
        return response;
    }

    @Transactional
    public OrderResponse updateItemStatus(Long orderItemId, ItemStatus newStatus, StaffUser staff) {
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new NotFoundException("Order item " + orderItemId + " not found"));
        validateItemTransition(item.getItemStatus(), newStatus);

        item.setItemStatus(newStatus);
        orderItemRepository.save(item);

        CustomerOrder order = item.getOrder();
        OrderStatus previousOrderStatus = order.getStatus();
        OrderStatus recomputed = recomputeOrderStatus(order);
        if (recomputed != previousOrderStatus) {
            order.setStatus(recomputed);
            customerOrderRepository.save(order);
            logEvent(order, previousOrderStatus, recomputed, staff);
        }

        OrderResponse response = orderMapper.toResponse(order);
        if (KITCHEN_VISIBLE_STATUSES.contains(order.getStatus())) {
            broadcaster.notifyKitchen(response);
        }
        if(order.getStatus().equals(OrderStatus.READY)) {
            broadcaster.notifyWaiter(response);
        }
        broadcaster.notifyTable(order.getTableSession().getId(), response);
        tableOverviewService.refreshAndBroadcast(order.getTableSession());
        return response;
    }

    @Transactional
    public OrderResponse removeItemBeforeConfirm(Long orderItemId, StaffUser waiter) {
        requirePlacedOrder(orderItemId);
        return updateItemStatus(orderItemId, ItemStatus.CANCELLED, waiter);
    }

    @Transactional
    public OrderResponse updateItemQuantity(Long orderItemId, int quantity, StaffUser waiter) {
        if (quantity <= 0) {
            return removeItemBeforeConfirm(orderItemId, waiter);
        }

        OrderItem item = requirePlacedOrder(orderItemId);
        item.setQuantity(quantity);
        orderItemRepository.save(item);

        OrderResponse response = orderMapper.toResponse(item.getOrder());
        broadcaster.notifyWaiter(response);
        broadcaster.notifyTable(item.getOrder().getTableSession().getId(), response);
        return response;
    }

    private OrderItem requirePlacedOrder(Long orderItemId) {
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new NotFoundException("Order item " + orderItemId + " not found"));
        if (item.getOrder().getStatus() != OrderStatus.PLACED) {
            throw new ConflictException("Can only edit an order's items before it is confirmed");
        }
        return item;
    }

    private void validateItemTransition(ItemStatus current, ItemStatus target) {
        if (target == ItemStatus.CANCELLED) {
            if (current == ItemStatus.SERVED) {
                throw new ConflictException("Cannot cancel an item that has already been served");
            }
            return;
        }
        int currentIdx = FORWARD_ITEM_STATUSES.indexOf(current);
        int targetIdx = FORWARD_ITEM_STATUSES.indexOf(target);
        if (currentIdx < 0 || targetIdx < 0 || targetIdx != currentIdx + 1) {
            throw new ConflictException("Cannot move item from " + current + " to " + target);
        }
    }

    private OrderStatus recomputeOrderStatus(CustomerOrder order) {
        List<ItemStatus> statuses = order.getItems().stream()
                .map(OrderItem::getItemStatus)
                .filter(s -> s != ItemStatus.CANCELLED)
                .toList();

        if (statuses.isEmpty()) {
            return OrderStatus.CANCELLED;
        }
        if (statuses.stream().allMatch(s -> s == ItemStatus.SERVED)) {
            return OrderStatus.SERVED;
        }
        if (statuses.stream().allMatch(s -> s == ItemStatus.READY || s == ItemStatus.SERVED)) {
            return OrderStatus.READY;
        }
        if (statuses.stream().anyMatch(s -> s == ItemStatus.PREPARING || s == ItemStatus.READY || s == ItemStatus.SERVED)) {
            return OrderStatus.PREPARING;
        }
        if (statuses.stream().allMatch(s -> s == ItemStatus.CONFIRMED)) {
            return OrderStatus.CONFIRMED;
        }
        return OrderStatus.PLACED;
    }

    CustomerOrder getOrderEntity(Long orderId) {
        return customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order " + orderId + " not found"));
    }

    void logEvent(CustomerOrder order, OrderStatus from, OrderStatus to, StaffUser staff) {
        orderStatusEventRepository.save(OrderStatusEvent.builder()
                .orderId(order.getId())
                .fromStatus(from)
                .toStatus(to)
                .changedBy(staff)
                .changedAt(Instant.now())
                .build());
    }
}
