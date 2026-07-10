package com.restro.backend.repository;

import com.restro.backend.domain.ItemStatus;
import com.restro.backend.domain.MenuItem;
import com.restro.backend.domain.OrderItem;
import com.restro.backend.domain.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findAllByItemStatusInOrderByIdAsc(List<ItemStatus> statuses);
    int countByOrder_TableSessionAndItemStatusIn(TableSession tableSession, List<ItemStatus> statuses);
    boolean existsByMenuItem(MenuItem menuItem);
}
