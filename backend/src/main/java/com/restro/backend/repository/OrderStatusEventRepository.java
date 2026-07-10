package com.restro.backend.repository;

import com.restro.backend.domain.OrderStatusEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface OrderStatusEventRepository extends JpaRepository<OrderStatusEvent, Long> {
    List<OrderStatusEvent> findAllByOrderIdOrderByChangedAtAsc(Long orderId);
    List<OrderStatusEvent> findAllByChangedAtBetween(Instant from, Instant to);
}
