package com.restro.backend.service;

import com.restro.backend.domain.Bill;
import com.restro.backend.domain.BillLineItem;
import com.restro.backend.domain.BillLineItemOption;
import com.restro.backend.domain.Customer;
import com.restro.backend.domain.DietaryType;
import com.restro.backend.domain.OrderStatus;
import com.restro.backend.domain.OrderStatusEvent;
import com.restro.backend.domain.TableSession;
import com.restro.backend.domain.TipPoolEntry;
import com.restro.backend.dto.CashierPerformanceEntry;
import com.restro.backend.dto.CashierPerformanceResponse;
import com.restro.backend.dto.CustomerRetentionResponse;
import com.restro.backend.dto.DailyRevenueResponse;
import com.restro.backend.dto.DailyTipBreakdown;
import com.restro.backend.dto.DietaryMixResponse;
import com.restro.backend.dto.OperationalTimingResponse;
import com.restro.backend.dto.PeakHourBucket;
import com.restro.backend.dto.RevenueSummaryResponse;
import com.restro.backend.dto.StaffBreakdownEntry;
import com.restro.backend.dto.TablePerformanceEntry;
import com.restro.backend.dto.TipSummaryResponse;
import com.restro.backend.dto.TopMenuItemResponse;
import com.restro.backend.dto.UpsellPerformanceEntry;
import com.restro.backend.dto.VoidDiscountReportResponse;
import com.restro.backend.dto.VoidReasonBreakdown;
import com.restro.backend.dto.WaiterPerformanceEntry;
import com.restro.backend.dto.WaiterPerformanceResponse;
import com.restro.backend.repository.BillRepository;
import com.restro.backend.repository.OrderStatusEventRepository;
import com.restro.backend.repository.TableSessionRepository;
import com.restro.backend.repository.TipPoolEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final BillRepository billRepository;
    private final OrderStatusEventRepository orderStatusEventRepository;
    private final TableSessionRepository tableSessionRepository;
    private final TipPoolEntryRepository tipPoolEntryRepository;

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

        List<Duration> toConfirm = new ArrayList<>();
        List<Duration> toServe = new ArrayList<>();

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

    @Transactional(readOnly = true)
    public VoidDiscountReportResponse getVoidDiscountReport(Instant from, Instant to) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);

        List<Bill> voided = bills.stream().filter(b -> b.getVoidedAt() != null).toList();
        BigDecimal totalVoidedAmount = voided.stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<Bill>> byReason = voided.stream()
                .collect(Collectors.groupingBy(b -> b.getVoidReason() != null ? b.getVoidReason() : "(no reason given)"));
        List<VoidReasonBreakdown> voidsByReason = byReason.entrySet().stream()
                .map(e -> new VoidReasonBreakdown(e.getKey(), e.getValue().size(),
                        e.getValue().stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparingInt(VoidReasonBreakdown::count).reversed())
                .toList();

        Map<String, List<Bill>> byVoidingStaff = voided.stream()
                .filter(b -> b.getVoidedBy() != null)
                .collect(Collectors.groupingBy(b -> b.getVoidedBy().getName()));
        List<StaffBreakdownEntry> voidsByStaff = byVoidingStaff.entrySet().stream()
                .map(e -> new StaffBreakdownEntry(e.getKey(), e.getValue().size(),
                        e.getValue().stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparingInt(StaffBreakdownEntry::count).reversed())
                .toList();

        List<Bill> discounted = bills.stream()
                .filter(b -> b.getDiscount() != null && b.getDiscount().compareTo(BigDecimal.ZERO) > 0)
                .toList();
        BigDecimal totalDiscountGiven = discounted.stream().map(Bill::getDiscount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRevenue = bills.stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discountAsPercentOfRevenue = totalRevenue.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : totalDiscountGiven.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));

        return new VoidDiscountReportResponse(from, to, totalVoidedAmount, voided.size(), voidsByReason, voidsByStaff,
                totalDiscountGiven, discounted.size(), discountAsPercentOfRevenue);
    }

    @Transactional(readOnly = true)
    public WaiterPerformanceResponse getWaiterPerformance(Instant from, Instant to) {
        List<OrderStatusEvent> events = orderStatusEventRepository.findAllByChangedAtBetween(from, to);
        Map<Long, List<OrderStatusEvent>> byOrder = events.stream().collect(Collectors.groupingBy(OrderStatusEvent::getOrderId));

        Map<Long, String> staffNames = new LinkedHashMap<>();
        Map<Long, List<Duration>> confirmDurationsByStaff = new LinkedHashMap<>();
        Map<Long, List<Duration>> serveDurationsByStaff = new LinkedHashMap<>();

        for (List<OrderStatusEvent> orderEvents : byOrder.values()) {
            OrderStatusEvent placedEvent = firstEvent(orderEvents, OrderStatus.PLACED);
            OrderStatusEvent confirmedEvent = firstEvent(orderEvents, OrderStatus.CONFIRMED);
            OrderStatusEvent servedEvent = firstEvent(orderEvents, OrderStatus.SERVED);

            if (placedEvent != null && confirmedEvent != null && confirmedEvent.getChangedBy() != null) {
                Long staffId = confirmedEvent.getChangedBy().getId();
                staffNames.putIfAbsent(staffId, confirmedEvent.getChangedBy().getName());
                confirmDurationsByStaff.computeIfAbsent(staffId, id -> new ArrayList<>())
                        .add(Duration.between(placedEvent.getChangedAt(), confirmedEvent.getChangedAt()));
            }
            if (confirmedEvent != null && servedEvent != null && servedEvent.getChangedBy() != null) {
                Long staffId = servedEvent.getChangedBy().getId();
                staffNames.putIfAbsent(staffId, servedEvent.getChangedBy().getName());
                serveDurationsByStaff.computeIfAbsent(staffId, id -> new ArrayList<>())
                        .add(Duration.between(confirmedEvent.getChangedAt(), servedEvent.getChangedAt()));
            }
        }

        Set<Long> staffIds = new LinkedHashSet<>();
        staffIds.addAll(confirmDurationsByStaff.keySet());
        staffIds.addAll(serveDurationsByStaff.keySet());

        List<WaiterPerformanceEntry> entries = staffIds.stream()
                .map(staffId -> {
                    List<Duration> confirmDurations = confirmDurationsByStaff.getOrDefault(staffId, List.of());
                    List<Duration> serveDurations = serveDurationsByStaff.getOrDefault(staffId, List.of());
                    return new WaiterPerformanceEntry(staffId, staffNames.get(staffId),
                            confirmDurations.size(), averageSeconds(confirmDurations),
                            serveDurations.size(), averageSeconds(serveDurations));
                })
                .sorted(Comparator.comparing(WaiterPerformanceEntry::staffName))
                .toList();

        return new WaiterPerformanceResponse(from, to, entries);
    }

    private OrderStatusEvent firstEvent(List<OrderStatusEvent> events, OrderStatus toStatus) {
        return events.stream()
                .filter(e -> e.getToStatus() == toStatus)
                .min(Comparator.comparing(OrderStatusEvent::getChangedAt))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public CashierPerformanceResponse getCashierPerformance(Instant from, Instant to) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);

        Map<Long, String> staffNames = new LinkedHashMap<>();
        Map<Long, List<Bill>> closedByStaff = bills.stream()
                .filter(b -> b.getPaidAt() != null && b.getClosedBy() != null)
                .peek(b -> staffNames.putIfAbsent(b.getClosedBy().getId(), b.getClosedBy().getName()))
                .collect(Collectors.groupingBy(b -> b.getClosedBy().getId()));

        Map<Long, List<Bill>> voidedByStaff = bills.stream()
                .filter(b -> b.getVoidedAt() != null && b.getVoidedBy() != null)
                .peek(b -> staffNames.putIfAbsent(b.getVoidedBy().getId(), b.getVoidedBy().getName()))
                .collect(Collectors.groupingBy(b -> b.getVoidedBy().getId()));

        Set<Long> staffIds = new LinkedHashSet<>();
        staffIds.addAll(closedByStaff.keySet());
        staffIds.addAll(voidedByStaff.keySet());

        List<CashierPerformanceEntry> entries = staffIds.stream()
                .map(staffId -> {
                    List<Bill> closed = closedByStaff.getOrDefault(staffId, List.of());
                    List<Bill> voided = voidedByStaff.getOrDefault(staffId, List.of());
                    BigDecimal avgBillValue = closed.isEmpty() ? BigDecimal.ZERO
                            : closed.stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add)
                                    .divide(BigDecimal.valueOf(closed.size()), 2, RoundingMode.HALF_UP);
                    BigDecimal totalVoidedAmount = voided.stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new CashierPerformanceEntry(staffId, staffNames.get(staffId), closed.size(), avgBillValue,
                            voided.size(), totalVoidedAmount);
                })
                .sorted(Comparator.comparing(CashierPerformanceEntry::staffName))
                .toList();

        return new CashierPerformanceResponse(from, to, entries);
    }

    @Transactional(readOnly = true)
    public CustomerRetentionResponse getCustomerRetention(Instant from, Instant to) {
        List<TableSession> sessions = tableSessionRepository.findAllByOpenedAtBetween(from, to);
        Map<Long, Customer> customersById = sessions.stream()
                .filter(s -> s.getCreatedByCustomer() != null)
                .map(TableSession::getCreatedByCustomer)
                .collect(Collectors.toMap(Customer::getId, c -> c, (a, b) -> a, LinkedHashMap::new));

        int newCustomers = 0;
        int returningCustomers = 0;
        for (Customer customer : customersById.values()) {
            boolean isNew = !customer.getCreatedAt().isBefore(from) && !customer.getCreatedAt().isAfter(to);
            if (isNew) {
                newCustomers++;
            } else {
                returningCustomers++;
            }
        }

        int uniqueCustomers = customersById.size();
        Double returningRate = uniqueCustomers == 0 ? null : (double) returningCustomers / uniqueCustomers * 100;

        return new CustomerRetentionResponse(from, to, uniqueCustomers, newCustomers, returningCustomers, returningRate);
    }

    @Transactional(readOnly = true)
    public List<TablePerformanceEntry> getTablePerformance(Instant from, Instant to) {
        List<TableSession> sessions = tableSessionRepository.findAllByOpenedAtBetween(from, to);
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);

        Map<String, List<TableSession>> sessionsByTable = sessions.stream()
                .collect(Collectors.groupingBy(s -> s.getTable().getTableNumber(), LinkedHashMap::new, Collectors.toList()));
        Map<String, List<Bill>> revenueByTable = bills.stream()
                .filter(b -> b.getVoidedAt() == null)
                .collect(Collectors.groupingBy(b -> b.getTableSession().getTable().getTableNumber()));

        Set<String> tableNumbers = new LinkedHashSet<>();
        tableNumbers.addAll(sessionsByTable.keySet());
        tableNumbers.addAll(revenueByTable.keySet());

        return tableNumbers.stream()
                .map(tableNumber -> {
                    List<TableSession> tableSessions = sessionsByTable.getOrDefault(tableNumber, List.of());
                    List<Duration> durations = tableSessions.stream()
                            .filter(s -> s.getClosedAt() != null)
                            .map(s -> Duration.between(s.getOpenedAt(), s.getClosedAt()))
                            .toList();
                    Double avgMinutes = durations.isEmpty() ? null
                            : durations.stream().mapToLong(Duration::toMinutes).average().orElse(0);
                    BigDecimal revenue = revenueByTable.getOrDefault(tableNumber, List.of()).stream()
                            .map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new TablePerformanceEntry(tableNumber, tableSessions.size(), avgMinutes, revenue);
                })
                .sorted(Comparator.comparing(TablePerformanceEntry::tableNumber))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PeakHourBucket> getPeakHours(Instant from, Instant to) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);

        record BucketKey(DayOfWeek dayOfWeek, int hourOfDay) {
        }
        Map<BucketKey, List<Bill>> byBucket = bills.stream()
                .collect(Collectors.groupingBy(b -> {
                    ZonedDateTime zdt = b.getGeneratedAt().atZone(ZoneOffset.UTC);
                    return new BucketKey(zdt.getDayOfWeek(), zdt.getHour());
                }));

        return byBucket.entrySet().stream()
                .map(e -> new PeakHourBucket(e.getKey().dayOfWeek(), e.getKey().hourOfDay(), e.getValue().size(),
                        e.getValue().stream().map(Bill::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparing(PeakHourBucket::dayOfWeek).thenComparingInt(PeakHourBucket::hourOfDay))
                .toList();
    }

    @Transactional(readOnly = true)
    public TipSummaryResponse getTipSummary(Instant from, Instant to) {
        List<TipPoolEntry> entries = tipPoolEntryRepository.findAllByRecordedAtBetweenOrderByRecordedAtAsc(from, to);

        BigDecimal totalTips = entries.stream().map(TipPoolEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<LocalDate, List<TipPoolEntry>> byDay = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getRecordedAt().atZone(ZoneOffset.UTC).toLocalDate(), LinkedHashMap::new, Collectors.toList()));
        List<DailyTipBreakdown> dailyBreakdown = byDay.entrySet().stream()
                .map(e -> new DailyTipBreakdown(e.getKey(),
                        e.getValue().stream().map(TipPoolEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().size()))
                .sorted(Comparator.comparing(DailyTipBreakdown::date))
                .toList();

        return new TipSummaryResponse(from, to, totalTips, entries.size(), dailyBreakdown);
    }

    @Transactional(readOnly = true)
    public DietaryMixResponse getDietaryMix(Instant from, Instant to) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);
        List<BillLineItem> lineItems = bills.stream().flatMap(b -> b.getLineItems().stream()).toList();

        BigDecimal vegRevenue = sumByDietaryType(lineItems, DietaryType.VEG);
        BigDecimal nonVegRevenue = sumByDietaryType(lineItems, DietaryType.NON_VEG);
        BigDecimal eggRevenue = sumByDietaryType(lineItems, DietaryType.EGG);
        BigDecimal untaggedRevenue = lineItems.stream()
                .filter(li -> li.getDietaryType() == null)
                .map(BillLineItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal total = vegRevenue.add(nonVegRevenue).add(eggRevenue).add(untaggedRevenue);
        Double vegPercent = percentOf(vegRevenue, total);
        Double nonVegPercent = percentOf(nonVegRevenue, total);
        Double eggPercent = percentOf(eggRevenue, total);

        return new DietaryMixResponse(from, to, vegRevenue, nonVegRevenue, eggRevenue, untaggedRevenue,
                vegPercent, nonVegPercent, eggPercent);
    }

    private BigDecimal sumByDietaryType(List<BillLineItem> lineItems, DietaryType type) {
        return lineItems.stream()
                .filter(li -> li.getDietaryType() == type)
                .map(BillLineItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Double percentOf(BigDecimal part, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return part.divide(total, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
    }

    @Transactional(readOnly = true)
    public List<UpsellPerformanceEntry> getUpsellPerformance(Instant from, Instant to) {
        List<Bill> bills = billRepository.findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(from, to);
        List<BillLineItemOption> options = bills.stream()
                .flatMap(b -> b.getLineItems().stream())
                .flatMap(li -> li.getOptions().stream())
                .toList();

        Map<String, List<BillLineItemOption>> byOptionName = options.stream()
                .collect(Collectors.groupingBy(BillLineItemOption::getOptionName));

        return byOptionName.entrySet().stream()
                .map(e -> new UpsellPerformanceEntry(e.getKey(), e.getValue().size(),
                        e.getValue().stream().map(BillLineItemOption::getPriceDelta).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparing(UpsellPerformanceEntry::totalRevenue).reversed())
                .toList();
    }
}
