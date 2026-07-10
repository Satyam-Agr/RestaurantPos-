package com.restro.backend.service;

import com.restro.backend.domain.Bill;
import com.restro.backend.domain.BillLineItem;
import com.restro.backend.domain.OrderStatus;
import com.restro.backend.domain.OrderStatusEvent;
import com.restro.backend.dto.DailyRevenueResponse;
import com.restro.backend.dto.OperationalTimingResponse;
import com.restro.backend.dto.RevenueSummaryResponse;
import com.restro.backend.dto.TopMenuItemResponse;
import com.restro.backend.repository.BillRepository;
import com.restro.backend.repository.OrderStatusEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final BillRepository billRepository;
    private final OrderStatusEventRepository orderStatusEventRepository;

    @Transactional(readOnly = true)
    public RevenueSummaryResponse getRevenueSummary(Instant from, Instant to) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);

        BigDecimal totalRevenue = bills.stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTax = bills.stream().map(Bill::getTax).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDiscount = bills.stream().map(Bill::getDiscount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageBillValue = bills.isEmpty() ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(bills.size()), 2, RoundingMode.HALF_UP);

        Map<java.time.LocalDate, List<Bill>> byDay = bills.stream()
                .collect(Collectors.groupingBy(b -> b.getGeneratedAt().atZone(ZoneOffset.UTC).toLocalDate(), LinkedHashMap::new, Collectors.toList()));

        List<DailyRevenueResponse> dailyBreakdown = byDay.entrySet().stream()
                .map(e -> new DailyRevenueResponse(
                        e.getKey(),
                        e.getValue().stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().size()
                ))
                .sorted(Comparator.comparing(DailyRevenueResponse::date))
                .toList();

        return new RevenueSummaryResponse(from, to, totalRevenue, totalTax, totalDiscount, bills.size(), averageBillValue, dailyBreakdown);
    }

    @Transactional(readOnly = true)
    public List<TopMenuItemResponse> getTopItems(Instant from, Instant to, int limit) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);

        Map<String, List<BillLineItem>> byName = bills.stream()
                .flatMap(b -> b.getLineItems().stream())
                .collect(Collectors.groupingBy(BillLineItem::getMenuItemName));

        return byName.entrySet().stream()
                .map(e -> new TopMenuItemResponse(
                        e.getKey(),
                        e.getValue().stream().mapToInt(BillLineItem::getQuantity).sum(),
                        e.getValue().stream().map(BillLineItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparingInt(TopMenuItemResponse::quantitySold).reversed())
                .limit(limit)
                .toList();
    }

    @Transactional(readOnly = true)
    public OperationalTimingResponse getOperationalTiming(Instant from, Instant to) {
        List<OrderStatusEvent> events = orderStatusEventRepository.findAllByChangedAtBetween(from, to);
        Map<Long, List<OrderStatusEvent>> byOrder = events.stream().collect(Collectors.groupingBy(OrderStatusEvent::getOrderId));

        List<Duration> toConfirm = new java.util.ArrayList<>();
        List<Duration> toServe = new java.util.ArrayList<>();

        for (List<OrderStatusEvent> orderEvents : byOrder.values()) {
            Instant placedAt = firstChangedAt(orderEvents, OrderStatus.PLACED);
            Instant confirmedAt = firstChangedAt(orderEvents, OrderStatus.CONFIRMED);
            Instant servedAt = firstChangedAt(orderEvents, OrderStatus.SERVED);

            if (placedAt != null && confirmedAt != null) {
                toConfirm.add(Duration.between(placedAt, confirmedAt));
            }
            if (confirmedAt != null && servedAt != null) {
                toServe.add(Duration.between(confirmedAt, servedAt));
            }
        }

        return new OperationalTimingResponse(from, to, averageSeconds(toConfirm), averageSeconds(toServe), byOrder.size());
    }

    private Instant firstChangedAt(List<OrderStatusEvent> events, OrderStatus toStatus) {
        return events.stream()
                .filter(e -> e.getToStatus() == toStatus)
                .map(OrderStatusEvent::getChangedAt)
                .min(Instant::compareTo)
                .orElse(null);
    }

    private Double averageSeconds(List<Duration> durations) {
        if (durations.isEmpty()) {
            return null;
        }
        return durations.stream().mapToLong(Duration::getSeconds).average().orElse(0);
    }
}
