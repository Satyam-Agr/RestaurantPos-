package com.restro.backend.controller;

import com.restro.backend.dto.OperationalTimingResponse;
import com.restro.backend.dto.RevenueSummaryResponse;
import com.restro.backend.dto.TopMenuItemResponse;
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

    private Instant orDefault(Instant value, Instant fallback) {
        return value != null ? value : fallback;
    }
}
