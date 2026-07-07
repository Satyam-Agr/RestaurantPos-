package com.restro.backend.ws;

import com.restro.backend.dto.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderEventBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyWaiter(OrderResponse order) {
        messagingTemplate.convertAndSend("/topic/waiter", order);
    }

    public void notifyKitchen(OrderResponse order) {
        messagingTemplate.convertAndSend("/topic/kitchen", order);
    }

    public void notifyCashier(Object payload) {
        messagingTemplate.convertAndSend("/topic/cashier", payload);
    }

    public void notifyTable(Long tableSessionId, OrderResponse order) {
        messagingTemplate.convertAndSend("/topic/table/" + tableSessionId, order);
    }

    public void notifyCart(Long tableSessionId, OrderResponse cart) {
        messagingTemplate.convertAndSend("/topic/cart/" + tableSessionId, cart);
    }
}
