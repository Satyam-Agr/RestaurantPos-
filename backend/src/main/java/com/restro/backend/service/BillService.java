package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.BillResponse;
import com.restro.backend.dto.CashierNotice;
import com.restro.backend.dto.GenerateBillRequest;
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
import java.util.List;

@Service
@RequiredArgsConstructor
public class BillService {

    private static final BigDecimal DEFAULT_TAX_RATE_PERCENT = BigDecimal.valueOf(5);
    private static final List<OrderStatus> EXCLUDED_FROM_BILLING = List.of(OrderStatus.CART, OrderStatus.CANCELLED);

    private final TableSessionRepository tableSessionRepository;
    private final RestaurantTableRepository restaurantTableRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final BillRepository billRepository;
    private final OrderService orderService;
    private final OrderEventBroadcaster broadcaster;

    @Transactional
    public void requestBill(String sessionToken) {
        TableSession session = tableSessionRepository.findBySessionToken(sessionToken)
                .filter(s -> s.getStatus() == SessionStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Active session not found"));

        List<CustomerOrder> orders = customerOrderRepository.findAllByTableSessionAndStatusNotIn(session, EXCLUDED_FROM_BILLING);
        boolean allServed = orders.stream().allMatch(o -> o.getStatus() == OrderStatus.SERVED);
        if (orders.isEmpty() || !allServed) {
            throw new ConflictException("All orders must be served before requesting the bill");
        }
        for (CustomerOrder order : orders) {
            order.setStatus(OrderStatus.BILL_REQUESTED);
            customerOrderRepository.save(order);
            orderService.logEvent(order, OrderStatus.SERVED, OrderStatus.BILL_REQUESTED, null);
        }
        broadcaster.notifyCashier(new CashierNotice("BILL_REQUESTED", session.getId(), session.getTable().getTableNumber(), null));
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

        BigDecimal taxRate = request.taxRatePercent() != null ? request.taxRatePercent() : DEFAULT_TAX_RATE_PERCENT;
        BigDecimal tax = subtotal.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal discount = request.discount() != null ? request.discount() : BigDecimal.ZERO;
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
