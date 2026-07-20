package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.BillLineItemResponse;
import com.restro.backend.dto.BillPaymentResponse;
import com.restro.backend.dto.BillRequestSummary;
import com.restro.backend.dto.BillResponse;
import com.restro.backend.dto.CashierNotice;
import com.restro.backend.dto.GenerateBillRequest;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.dto.PayBillRequest;
import com.restro.backend.dto.PaySplitBillRequest;
import com.restro.backend.dto.PaymentEntryRequest;
import com.restro.backend.dto.TipPoolEntryResponse;
import com.restro.backend.dto.VoidBillRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.BillRepository;
import com.restro.backend.repository.CustomerOrderRepository;
import com.restro.backend.repository.RestaurantTableRepository;
import com.restro.backend.repository.TableSessionRepository;
import com.restro.backend.repository.TipPoolEntryRepository;
import com.restro.backend.ws.OrderEventBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final TipPoolEntryRepository tipPoolEntryRepository;
    private final OrderService orderService;
    private final SessionService sessionService;
    private final TableOverviewService tableOverviewService;
    private final OrderMapper orderMapper;
    private final OrderEventBroadcaster broadcaster;

    @Value("${app.billing.free-table-on-generate}")
    private boolean freeTableOnGenerate;

    @Transactional
    public void requestBill(String sessionToken) {
        TableSession session = tableSessionRepository.findBySessionToken(sessionToken)
                .filter(s -> s.getStatus() == SessionStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Active session not found"));
        transitionToBillRequested(session);
        tableOverviewService.refreshAndBroadcast(session);
    }

    @Transactional
    public void requestBillForTable(Long tableId) {
        RestaurantTable table = restaurantTableRepository.findById(tableId)
                .orElseThrow(() -> new NotFoundException("Table " + tableId + " not found"));
        TableSession session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("No active session for this table"));
        transitionToBillRequested(session);
        tableOverviewService.refreshAndBroadcast(session);
    }

    // Shared by the customer-facing bill-request flow and the cashier's generate-directly path.
    void transitionToBillRequested(TableSession session) {
        if (customerOrderRepository.existsByTableSessionAndStatus(session, OrderStatus.BILL_REQUESTED)) {
            throw new ConflictException("The bill has already been requested for this table");
        }

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
            broadcaster.notifyTable(session.getId(), orderMapper.toCustomerResponse(order));
        }

        broadcaster.notifyCashier(new CashierNotice("BILL_REQUEST_REVERTED", session.getId(), session.getTable().getTableNumber(), null));
        tableOverviewService.refreshAndBroadcast(session);
    }

    @Transactional
    public BillResponse generateBill(Long sessionId, GenerateBillRequest request) {
        TableSession session = tableSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session " + sessionId + " not found"));

        if (!customerOrderRepository.existsByTableSessionAndStatus(session, OrderStatus.BILL_REQUESTED)) {
            transitionToBillRequested(session);
        }

        List<CustomerOrder> billableOrders = customerOrderRepository.findAllByTableSessionAndStatusNotIn(session, EXCLUDED_FROM_BILLING);
        if (billableOrders.isEmpty()) {
            throw new ConflictException("No billable orders found for this session — either nothing was served, or the bill was already generated");
        }

        List<OrderItem> billableItems = billableOrders.stream()
                .flatMap(o -> o.getItems().stream())
                .filter(item -> item.getItemStatus() != ItemStatus.CANCELLED)
                .toList();

        BigDecimal subtotal = billableItems.stream()
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
        for (OrderItem item : billableItems) {
            String customizationSummary = item.getSelectedOptions().isEmpty() ? null
                    : item.getSelectedOptions().stream().map(OrderItemSelectedOption::getOptionName).collect(Collectors.joining(", "));
            BillLineItem lineItem = BillLineItem.builder()
                    .bill(bill)
                    .menuItemName(item.getMenuItem().getName())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .lineTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .customizationSummary(customizationSummary)
                    .dietaryType(item.getMenuItem().getDietaryType())
                    .build();
            for (OrderItemSelectedOption selected : item.getSelectedOptions()) {
                lineItem.getOptions().add(BillLineItemOption.builder()
                        .billLineItem(lineItem)
                        .optionName(selected.getOptionName())
                        .priceDelta(selected.getPriceDelta())
                        .build());
            }
            bill.getLineItems().add(lineItem);
        }
        bill = billRepository.save(bill);

        if (freeTableOnGenerate) {
            sessionService.closeSessionAndFreeTable(session);
        }

        List<CustomerOrder> allSessionOrders = customerOrderRepository.findAllByTableSessionOrderByPlacedAtAsc(session);
        customerOrderRepository.deleteAll(allSessionOrders);

        BillResponse response = toResponse(bill);
        broadcaster.notifyCashier(new CashierNotice("BILL_GENERATED", session.getId(), session.getTable().getTableNumber(), response));
        tableOverviewService.refreshAndBroadcast(session);
        return response;
    }

    @Transactional
    public BillResponse payBill(Long billId, PayBillRequest request, StaffUser cashier) {
        Bill bill = requirePayableBill(billId);

        BigDecimal tip = request.tip() != null ? request.tip() : BigDecimal.ZERO;
        applyTip(bill, tip);
        bill.setPaymentMethod(request.paymentMethod());
        bill.getPayments().add(BillPayment.builder()
                .bill(bill)
                .paymentMethod(request.paymentMethod())
                .amount(bill.getTotal())
                .recordedAt(Instant.now())
                .build());

        return finalizePayment(bill, cashier);
    }

    @Transactional
    public BillResponse payBillSplit(Long billId, PaySplitBillRequest request, StaffUser cashier) {
        Bill bill = requirePayableBill(billId);

        BigDecimal tip = request.tip() != null ? request.tip() : BigDecimal.ZERO;
        applyTip(bill, tip);

        BigDecimal sum = request.payments().stream().map(PaymentEntryRequest::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(bill.getTotal()) != 0) {
            throw new ConflictException("Payment amounts must add up to the bill total — expected " + bill.getTotal() + ", got " + sum);
        }

        bill.setPaymentMethod(PaymentMethod.OTHER);
        for (PaymentEntryRequest entry : request.payments()) {
            bill.getPayments().add(BillPayment.builder()
                    .bill(bill)
                    .paymentMethod(entry.paymentMethod())
                    .amount(entry.amount())
                    .recordedAt(Instant.now())
                    .build());
        }

        return finalizePayment(bill, cashier);
    }

    @Transactional
    public BillResponse voidBill(Long billId, VoidBillRequest request, StaffUser cashier) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Bill " + billId + " not found"));
        if (bill.getPaidAt() == null) {
            throw new ConflictException("Bill " + billId + " hasn't been paid yet — nothing to void");
        }
        if (bill.getVoidedAt() != null) {
            throw new ConflictException("Bill " + billId + " has already been voided");
        }

        bill.setVoidedAt(Instant.now());
        bill.setVoidedBy(cashier);
        bill.setVoidReason(request.reason());
        billRepository.save(bill);

        BillResponse response = toResponse(bill);
        TableSession session = bill.getTableSession();
        broadcaster.notifyCashier(new CashierNotice("BILL_VOIDED", session.getId(), session.getTable().getTableNumber(), response));
        return response;
    }

    private Bill requirePayableBill(Long billId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Bill " + billId + " not found"));
        if (bill.getPaidAt() != null) {
            throw new ConflictException("Bill " + billId + " is already paid");
        }
        return bill;
    }

    private void applyTip(Bill bill, BigDecimal tip) {
        bill.setTip(tip);
        bill.setTotal(bill.getSubtotal().add(bill.getTax()).subtract(bill.getDiscount()).add(tip));
    }

    // Shared tail for both the single-method and split-payment paths.
    private BillResponse finalizePayment(Bill bill, StaffUser cashier) {
        bill.setClosedBy(cashier);
        bill.setPaidAt(Instant.now());
        billRepository.save(bill);

        TableSession session = bill.getTableSession();
        if (session.getStatus() != SessionStatus.CLOSED) {
            sessionService.closeSessionAndFreeTable(session);
        }

        if (bill.getTip() != null && bill.getTip().compareTo(BigDecimal.ZERO) > 0) {
            tipPoolEntryRepository.save(TipPoolEntry.builder()
                    .billId(bill.getId())
                    .sessionId(session.getId())
                    .tableNumber(session.getTable().getTableNumber())
                    .amount(bill.getTip())
                    .recordedAt(Instant.now())
                    .build());
        }

        BillResponse response = toResponse(bill);
        broadcaster.notifyCashier(new CashierNotice("BILL_PAID", session.getId(), session.getTable().getTableNumber(), response));
        tableOverviewService.refreshAndBroadcast(session);
        return response;
    }

    @Transactional(readOnly = true)
    public List<BillResponse> getPendingBills() {
        return billRepository.findAllByPaidAtIsNull().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BillResponse> getBillHistory(Instant from, Instant to) {
        return billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TipPoolEntryResponse> getTipPool(Instant from, Instant to) {
        return tipPoolEntryRepository.findAllByRecordedAtBetweenOrderByRecordedAtAsc(from, to).stream()
                .map(e -> new TipPoolEntryResponse(e.getId(), e.getBillId(), e.getSessionId(), e.getTableNumber(), e.getAmount(), e.getRecordedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public BillResponse getBillForSession(String sessionToken) {
        TableSession session = tableSessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new NotFoundException("Session not found"));
        Bill bill = billRepository.findByTableSession(session)
                .orElseThrow(() -> new NotFoundException("No bill has been generated for this session yet"));
        return toResponse(bill);
    }

    private BillResponse toResponse(Bill bill) {
        List<BillLineItemResponse> items = bill.getLineItems().stream()
                .map(li -> new BillLineItemResponse(li.getMenuItemName(), li.getQuantity(), li.getUnitPrice(), li.getLineTotal(), li.getCustomizationSummary()))
                .toList();
        List<BillPaymentResponse> payments = bill.getPayments().stream()
                .map(p -> new BillPaymentResponse(p.getPaymentMethod(), p.getAmount()))
                .toList();
        return new BillResponse(
                bill.getId(),
                bill.getTableSession().getId(),
                bill.getTableSession().getTable().getTableNumber(),
                bill.getSubtotal(),
                bill.getTax(),
                bill.getDiscount(),
                bill.getTip() != null ? bill.getTip() : BigDecimal.ZERO,
                bill.getTotal(),
                bill.getPaymentMethod(),
                bill.getGeneratedAt(),
                bill.getPaidAt(),
                bill.getVoidedAt(),
                bill.getVoidReason(),
                items,
                payments
        );
    }
}
