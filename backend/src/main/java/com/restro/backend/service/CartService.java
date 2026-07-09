package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.CartItemUpdateRequest;
import com.restro.backend.dto.OrderItemRequest;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.CustomerOrderRepository;
import com.restro.backend.repository.MenuItemRepository;
import com.restro.backend.ws.OrderEventBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CustomerOrderRepository customerOrderRepository;
    private final MenuItemRepository menuItemRepository;
    private final SessionService sessionService;
    private final OrderService orderService;
    private final TableOverviewService tableOverviewService;
    private final OrderMapper orderMapper;
    private final OrderEventBroadcaster broadcaster;

    @Transactional(readOnly = true)
    public OrderResponse getCart(String sessionToken) {
        TableSession session = sessionService.getActiveSessionByToken(sessionToken);
        return orderMapper.toResponse(getCartOrder(session));
    }

    @Transactional
    public OrderResponse addItem(String sessionToken, OrderItemRequest request) {
        TableSession session = sessionService.getActiveSessionByToken(sessionToken);
        requireBillNotRequested(session);
        CustomerOrder cart = getCartOrder(session);

        MenuItem menuItem = menuItemRepository.findById(request.menuItemId())
                .orElseThrow(() -> new NotFoundException("Menu item " + request.menuItemId() + " not found"));
        if (!menuItem.isAvailable()) {
            throw new ConflictException("Menu item '" + menuItem.getName() + "' is currently unavailable");
        }

        OrderItem item = OrderItem.builder()
                .order(cart)
                .menuItem(menuItem)
                .quantity(request.quantity())
                .unitPrice(menuItem.getPrice())
                .notes(request.notes())
                .itemStatus(ItemStatus.PENDING)
                .build();
        cart.getItems().add(item);
        customerOrderRepository.save(cart);

        return broadcastCart(session.getId(), cart);
    }

    @Transactional
    public OrderResponse updateItem(String sessionToken, Long itemId, CartItemUpdateRequest request) {
        TableSession session = sessionService.getActiveSessionByToken(sessionToken);
        requireBillNotRequested(session);
        CustomerOrder cart = getCartOrder(session);
        OrderItem item = findCartItem(cart, itemId);

        if (request.quantity() != null && request.quantity() <= 0) {
            cart.getItems().remove(item);
        } else {
            if (request.quantity() != null) {
                item.setQuantity(request.quantity());
            }
            if (request.notes() != null) {
                item.setNotes(request.notes());
            }
        }
        customerOrderRepository.save(cart);

        return broadcastCart(session.getId(), cart);
    }

    @Transactional
    public OrderResponse removeItem(String sessionToken, Long itemId) {
        TableSession session = sessionService.getActiveSessionByToken(sessionToken);
        requireBillNotRequested(session);
        CustomerOrder cart = getCartOrder(session);
        OrderItem item = findCartItem(cart, itemId);
        cart.getItems().remove(item);
        customerOrderRepository.save(cart);

        return broadcastCart(session.getId(), cart);
    }

    @Transactional
    public OrderResponse submit(String sessionToken) {
        TableSession session = sessionService.getActiveSessionByToken(sessionToken);
        requireBillNotRequested(session);
        CustomerOrder cart = getCartOrder(session);
        if (cart.getItems().isEmpty()) {
            throw new ConflictException("Cannot submit an empty cart");
        }

        cart.setStatus(OrderStatus.PLACED);
        cart.setPlacedAt(Instant.now());
        customerOrderRepository.save(cart);
        orderService.logEvent(cart, OrderStatus.CART, OrderStatus.PLACED, null);

        OrderResponse placedResponse = orderMapper.toResponse(cart);
        broadcaster.notifyWaiter(placedResponse);

        CustomerOrder freshCart = CustomerOrder.builder()
                .tableSession(session)
                .status(OrderStatus.CART)
                .build();
        freshCart = customerOrderRepository.save(freshCart);
        broadcaster.notifyCart(session.getId(), orderMapper.toResponse(freshCart));
        tableOverviewService.refreshAndBroadcast(session);

        return placedResponse;
    }

    private OrderResponse broadcastCart(Long sessionId, CustomerOrder cart) {
        OrderResponse response = orderMapper.toResponse(cart);
        broadcaster.notifyCart(sessionId, response);
        return response;
    }

    private void requireBillNotRequested(TableSession session) {
        if (customerOrderRepository.existsByTableSessionAndStatus(session, OrderStatus.BILL_REQUESTED)) {
            throw new ConflictException("The bill has already been requested for this table — no further changes are allowed");
        }
    }

    private CustomerOrder getCartOrder(TableSession session) {
        return customerOrderRepository.findByTableSessionAndStatus(session, OrderStatus.CART)
                .orElseThrow(() -> new NotFoundException("No open cart for this session"));
    }

    private OrderItem findCartItem(CustomerOrder cart, Long itemId) {
        return cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Item " + itemId + " not found in this cart"));
    }
}
