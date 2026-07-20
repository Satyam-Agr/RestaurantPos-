package com.restro.backend.controller;

import com.restro.backend.dto.CashierPerformanceResponse;
import com.restro.backend.dto.CustomerRetentionResponse;
import com.restro.backend.dto.DietaryMixResponse;
import com.restro.backend.dto.OperationalTimingResponse;
import com.restro.backend.dto.PeakHourBucket;
import com.restro.backend.dto.RevenueSummaryResponse;
import com.restro.backend.dto.TablePerformanceEntry;
import com.restro.backend.dto.TipSummaryResponse;
import com.restro.backend.dto.TopMenuItemResponse;
import com.restro.backend.dto.UpsellPerformanceEntry;
import com.restro.backend.dto.VoidDiscountReportResponse;
import com.restro.backend.dto.WaiterPerformanceResponse;
import com.restro.backend.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    @GetMapping("/revenue")
    public RevenueSummaryResponse getRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getRevenueSummary(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/top-items")
    public List<TopMenuItemResponse> getTopItems(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return adminAnalyticsService.getTopItems(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()), limit);
    }

    @GetMapping("/timing")
    public OperationalTimingResponse getTiming(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getOperationalTiming(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/void-discount-report")
    public VoidDiscountReportResponse getVoidDiscountReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getVoidDiscountReport(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/staff-performance/waiters")
    public WaiterPerformanceResponse getWaiterPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getWaiterPerformance(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/staff-performance/cashiers")
    public CashierPerformanceResponse getCashierPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getCashierPerformance(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/customer-retention")
    public CustomerRetentionResponse getCustomerRetention(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getCustomerRetention(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/table-performance")
    public List<TablePerformanceEntry> getTablePerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getTablePerformance(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/peak-hours")
    public List<PeakHourBucket> getPeakHours(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getPeakHours(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/tip-summary")
    public TipSummaryResponse getTipSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getTipSummary(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/dietary-mix")
    public DietaryMixResponse getDietaryMix(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getDietaryMix(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    @GetMapping("/upsell-performance")
    public List<UpsellPerformanceEntry> getUpsellPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return adminAnalyticsService.getUpsellPerformance(orDefault(from, Instant.EPOCH), orDefault(to, Instant.now()));
    }

    private Instant orDefault(Instant value, Instant fallback) {
        return value != null ? value : fallback;
    }
}
