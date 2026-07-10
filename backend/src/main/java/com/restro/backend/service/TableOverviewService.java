package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.*;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.*;
import com.restro.backend.ws.OrderEventBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TableOverviewService {

    private static final List<ItemStatus> KITCHEN_ITEM_STATUSES = List.of(ItemStatus.CONFIRMED, ItemStatus.PREPARING);
    private static final List<ItemStatus> READY_ITEM_STATUSES = List.of(ItemStatus.READY);
    private static final List<OrderStatus> BILLABLE_STATUSES = List.of(OrderStatus.CART, OrderStatus.CANCELLED);
    private static final List<OrderStatus> SUBMITTED_ORDER_STATUSES = List.of(
            OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING,
            OrderStatus.READY, OrderStatus.SERVED, OrderStatus.BILL_REQUESTED
    );

    private final RestaurantTableRepository restaurantTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final OrderMapper orderMapper;
    private final OrderEventBroadcaster broadcaster;

    @Transactional(readOnly = true)
    public List<TableSummaryResponse> getAllTableSummaries() {
        return restaurantTableRepository.findAll().stream()
                .filter(t -> !Boolean.TRUE.equals(t.getRetired()))
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public WaiterTableDetailResponse getWaiterDetail(Long tableId) {
        RestaurantTable table = requireTable(tableId);
        Optional<TableSession> session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE);
        TableSummaryResponse summary = toSummary(table, session);

        String pin = session.map(TableSession::getPin).orElse(null);
        List<OrderResponse> orders = fetchOrders(session);

        return new WaiterTableDetailResponse(
                summary.tableId(), summary.tableNumber(), summary.tableStatus(), summary.overviewStatus(),
                summary.sessionId(), pin, summary.openedAt(), summary.participantCount(), summary.billRequested(),
                orders
        );
    }

    @Transactional(readOnly = true)
    public CashierTableDetailResponse getCashierDetail(Long tableId) {
        RestaurantTable table = requireTable(tableId);
        Optional<TableSession> session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE);
        TableSummaryResponse summary = toSummary(table, session);

        int orderCount = session.map(s -> customerOrderRepository.findAllByTableSessionAndStatusNotIn(s, BILLABLE_STATUSES).size())
                .orElse(0);
        BigDecimal estimatedTotal = session.map(this::calculateSubtotal).orElse(null);
        List<OrderResponse> orders = fetchOrders(session);

        return new CashierTableDetailResponse(
                summary.tableId(), summary.tableNumber(), summary.tableStatus(), summary.overviewStatus(),
                summary.sessionId(), summary.openedAt(), summary.participantCount(), summary.billRequested(),
                orderCount, estimatedTotal, orders
        );
    }

    @Transactional(readOnly = true)
    public AdminTableDetailResponse getAdminDetail(Long tableId) {
        RestaurantTable table = requireTable(tableId);
        Optional<TableSession> session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE);
        TableSummaryResponse summary = toSummary(table, session);

        String pin = session.map(TableSession::getPin).orElse(null);
        BigDecimal estimatedTotal = session.map(this::calculateSubtotal).orElse(null);
        List<OrderResponse> orders = fetchOrders(session);

        return new AdminTableDetailResponse(
                summary.tableId(), summary.tableNumber(), summary.tableStatus(), summary.overviewStatus(),
                summary.sessionId(), pin, summary.openedAt(), summary.participantCount(), summary.billRequested(),
                estimatedTotal, orders
        );
    }

    private List<OrderResponse> fetchOrders(Optional<TableSession> session) {
        return session
                .map(s -> customerOrderRepository.findAllByTableSessionAndStatusNotInOrderByPlacedAtAsc(s, List.of(OrderStatus.CART)))
                .orElse(List.of())
                .stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    // Re-resolves the table's current active session fresh rather than trusting the passed-in
    // reference is still active — it may have just been closed by the caller (generate/pay/auto-close).
    @Transactional
    public void refreshAndBroadcast(TableSession session) {
        broadcaster.notifyTableOverview(toSummary(session.getTable()));
    }

    private TableSummaryResponse toSummary(RestaurantTable table) {
        return toSummary(table, tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE));
    }

    private TableSummaryResponse toSummary(RestaurantTable table, Optional<TableSession> sessionOpt) {
        if (sessionOpt.isEmpty()) {
            return new TableSummaryResponse(table.getId(), table.getTableNumber(), table.getStatus(),
                    TableOverviewStatus.AVAILABLE, null, null, null, null, null, null, null);
        }

        TableSession session = sessionOpt.get();
        int participantCount = sessionParticipantRepository.countByTableSessionAndLeftAtIsNull(session);
        int ordersAwaitingConfirmation = customerOrderRepository.countByTableSessionAndStatus(session, OrderStatus.PLACED);
        int itemsInKitchen = orderItemRepository.countByOrder_TableSessionAndItemStatusIn(session, KITCHEN_ITEM_STATUSES);
        int itemsReadyToServe = orderItemRepository.countByOrder_TableSessionAndItemStatusIn(session, READY_ITEM_STATUSES);
        boolean billRequested = customerOrderRepository.existsByTableSessionAndStatus(session, OrderStatus.BILL_REQUESTED);
        boolean hasAnyOrder = customerOrderRepository.existsByTableSessionAndStatusIn(session, SUBMITTED_ORDER_STATUSES);

        TableOverviewStatus overviewStatus;
        if (ordersAwaitingConfirmation > 0) {
            overviewStatus = TableOverviewStatus.NEEDS_CONFIRMATION;
        } else if (itemsReadyToServe > 0) {
            overviewStatus = TableOverviewStatus.READY_TO_SERVE;
        } else if (billRequested) {
            overviewStatus = TableOverviewStatus.BILL_REQUESTED;
        } else if (itemsInKitchen > 0) {
            overviewStatus = TableOverviewStatus.PREPARING;
        } else if (!hasAnyOrder) {
            overviewStatus = TableOverviewStatus.AWAITING_ORDER;
        } else {
            overviewStatus = TableOverviewStatus.SERVED_AWAITING_BILL;
        }

        return new TableSummaryResponse(table.getId(), table.getTableNumber(), table.getStatus(), overviewStatus,
                session.getId(), session.getOpenedAt(), participantCount, ordersAwaitingConfirmation,
                itemsInKitchen, itemsReadyToServe, billRequested);
    }

    private BigDecimal calculateSubtotal(TableSession session) {
        return customerOrderRepository.findAllByTableSessionAndStatusNotIn(session, BILLABLE_STATUSES).stream()
                .flatMap(o -> o.getItems().stream())
                .filter(item -> item.getItemStatus() != ItemStatus.CANCELLED)
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private RestaurantTable requireTable(Long tableId) {
        return restaurantTableRepository.findById(tableId)
                .orElseThrow(() -> new NotFoundException("Table " + tableId + " not found"));
    }
}
