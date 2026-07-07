package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.BillRequestSummary;
import com.restro.backend.dto.BillResponse;
import com.restro.backend.dto.CashierNotice;
import com.restro.backend.dto.GenerateBillRequest;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.dto.PayBillRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.BillRepository;
import com.restro.backend.repository.CustomerOrderRepository;
import com.restro.backend.repository.RestaurantTableRepository;
import com.restro.backend.repository.TableSessionRepository;
import com.restro.backend.ws.OrderEventBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillService {

    private static final List<OrderStatus> EXCLUDED_FROM_BILLING = List.of(OrderStatus.CART, OrderStatus.CANCELLED);

    private final TableSessionRepository tableSessionRepository;
    private final RestaurantTableRepository restaurantTableRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final BillRepository billRepository;
    private final OrderService orderService;
    private final OrderMapper orderMapper;
    private final OrderEventBroadcaster broadcaster;

    @Transactional
    public void requestBill(String sessionToken) {
        TableSession session = tableSessionRepository.findBySessionToken(sessionToken)
                .filter(s -> s.getStatus() == SessionStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Active session not found"));

        List<CustomerOrder> orders = customerOrderRepository.findAllByTableSessionAndStatusNotIn(session, EXCLUDED_FROM_BILLING);
        boolean anyStillInProgress = orders.stream().anyMatch(o -> o.getStatus() != OrderStatus.SERVED);
        if (anyStillInProgress) {
            throw new ConflictException("All orders must be served before requesting the bill");
        }
        for (CustomerOrder order : orders) {
            order.setStatus(OrderStatus.BILL_REQUESTED);
            customerOrderRepository.save(order);
            orderService.logEvent(order, OrderStatus.SERVED, OrderStatus.BILL_REQUESTED, null);
        }
        broadcaster.notifyCashier(new CashierNotice("BILL_REQUESTED", session.getId(), session.getTable().getTableNumber(), null));
    }

    @Transactional(readOnly = true)
    public List<BillRequestSummary> getBillRequestedSessions() {
        List<CustomerOrder> orders = customerOrderRepository.findAllByStatusOrderByPlacedAtAsc(OrderStatus.BILL_REQUESTED);
        Map<Long, List<CustomerOrder>> bySession = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getTableSession().getId(), LinkedHashMap::new, Collectors.toList()));

        return bySession.values().stream()
                .map(sessionOrders -> {
                    TableSession session = sessionOrders.get(0).getTableSession();
                    List<OrderResponse> orderResponses = sessionOrders.stream().map(orderMapper::toResponse).toList();
                    return new BillRequestSummary(session.getId(), session.getTable().getTableNumber(), orderResponses);
                })
                .toList();
    }

    @Transactional
    public void revertBillRequest(Long sessionId, StaffUser cashier) {
        TableSession session = tableSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session " + sessionId + " not found"));

        List<CustomerOrder> orders = customerOrderRepository.findAllByTableSessionAndStatus(session, OrderStatus.BILL_REQUESTED);
        if (orders.isEmpty()) {
            throw new ConflictException("No bill request is pending for this session");
        }

        for (CustomerOrder order : orders) {
            order.setStatus(OrderStatus.SERVED);
            customerOrderRepository.save(order);
            orderService.logEvent(order, OrderStatus.BILL_REQUESTED, OrderStatus.SERVED, cashier);
            broadcaster.notifyTable(session.getId(), orderMapper.toResponse(order));
        }

        broadcaster.notifyCashier(new CashierNotice("BILL_REQUEST_REVERTED", session.getId(), session.getTable().getTableNumber(), null));
    }

    @Transactional
    public BillResponse generateBill(Long sessionId, GenerateBillRequest request) {
        TableSession session = tableSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session " + sessionId + " not found"));

        List<CustomerOrder> orders = customerOrderRepository.findAllByTableSessionAndStatusNotIn(session, EXCLUDED_FROM_BILLING);
        BigDecimal subtotal = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .filter(item -> item.getItemStatus() != ItemStatus.CANCELLED)
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal tax = subtotal.multiply(request.taxRatePercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal discount = request.discount();
        BigDecimal total = subtotal.add(tax).subtract(discount);

        Bill bill = billRepository.findByTableSessionAndPaidAtIsNull(session).orElseGet(Bill::new);
        bill.setTableSession(session);
        bill.setSubtotal(subtotal);
        bill.setTax(tax);
        bill.setDiscount(discount);
        bill.setTotal(total);
        bill.setGeneratedAt(Instant.now());
        bill = billRepository.save(bill);

        BillResponse response = toResponse(bill);
        broadcaster.notifyCashier(new CashierNotice("BILL_GENERATED", session.getId(), session.getTable().getTableNumber(), response));
        return response;
    }

    @Transactional
    public BillResponse payBill(Long billId, PayBillRequest request, StaffUser cashier) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Bill " + billId + " not found"));
        if (bill.getPaidAt() != null) {
            throw new ConflictException("Bill " + billId + " is already paid");
        }

        bill.setPaymentMethod(request.paymentMethod());
        bill.setClosedBy(cashier);
        bill.setPaidAt(Instant.now());
        billRepository.save(bill);

        TableSession session = bill.getTableSession();
        List<CustomerOrder> orders = customerOrderRepository.findAllByTableSessionAndStatusNotIn(session, EXCLUDED_FROM_BILLING);
        for (CustomerOrder order : orders) {
            OrderStatus previous = order.getStatus();
            order.setStatus(OrderStatus.PAID);
            customerOrderRepository.save(order);
            orderService.logEvent(order, previous, OrderStatus.PAID, cashier);
        }

        session.setStatus(SessionStatus.CLOSED);
        session.setClosedAt(Instant.now());
        tableSessionRepository.save(session);

        RestaurantTable table = session.getTable();
        table.setStatus(TableStatus.AVAILABLE);
        restaurantTableRepository.save(table);

        BillResponse response = toResponse(bill);
        broadcaster.notifyCashier(new CashierNotice("BILL_PAID", session.getId(), table.getTableNumber(), response));
        return response;
    }

    @Transactional(readOnly = true)
    public List<BillResponse> getPendingBills() {
        return billRepository.findAllByPaidAtIsNull().stream().map(this::toResponse).toList();
    }

    private BillResponse toResponse(Bill bill) {
        return new BillResponse(
                bill.getId(),
                bill.getTableSession().getId(),
                bill.getSubtotal(),
                bill.getTax(),
                bill.getDiscount(),
                bill.getTotal(),
                bill.getPaymentMethod(),
                bill.getGeneratedAt(),
                bill.getPaidAt()
        );
    }
}
