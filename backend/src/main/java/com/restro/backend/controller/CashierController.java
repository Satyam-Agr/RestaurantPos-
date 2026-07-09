package com.restro.backend.controller;

import com.restro.backend.dto.CashierTableDetailResponse;
import com.restro.backend.dto.TableSummaryResponse;
import com.restro.backend.service.TableOverviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cashier")
@RequiredArgsConstructor
public class CashierController {

    private final TableOverviewService tableOverviewService;

    @GetMapping("/tables")
    public List<TableSummaryResponse> getTables() {
        return tableOverviewService.getAllTableSummaries();
    }

    @GetMapping("/tables/{tableId}")
    public CashierTableDetailResponse getTable(@PathVariable Long tableId) {
        return tableOverviewService.getCashierDetail(tableId);
    }
}
