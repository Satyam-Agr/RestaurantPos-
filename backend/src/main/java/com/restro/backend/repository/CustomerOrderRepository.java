package com.restro.backend.repository;

import com.restro.backend.domain.CustomerOrder;
import com.restro.backend.domain.OrderStatus;
import com.restro.backend.domain.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findAllByStatusOrderByPlacedAtAsc(OrderStatus status);
    List<CustomerOrder> findAllByStatusInOrderByPlacedAtAsc(List<OrderStatus> statuses);
    List<CustomerOrder> findAllByTableSessionOrderByPlacedAtAsc(TableSession tableSession);
    List<CustomerOrder> findAllByTableSessionAndStatusNotIn(TableSession tableSession, List<OrderStatus> statuses);
    List<CustomerOrder> findAllByTableSessionAndStatusNotInOrderByPlacedAtAsc(TableSession tableSession, List<OrderStatus> statuses);
    Optional<CustomerOrder> findByTableSessionAndStatus(TableSession tableSession, OrderStatus status);
    List<CustomerOrder> findAllByTableSessionAndStatus(TableSession tableSession, OrderStatus status);
    boolean existsByTableSessionAndStatus(TableSession tableSession, OrderStatus status);
    boolean existsByTableSessionAndStatusIn(TableSession tableSession, List<OrderStatus> statuses);
    int countByTableSessionAndStatus(TableSession tableSession, OrderStatus status);
}
