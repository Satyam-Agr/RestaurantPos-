package com.restro.backend.repository;

import com.restro.backend.domain.OrderStatusEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusEventRepository extends JpaRepository<OrderStatusEvent, Long> {
}
