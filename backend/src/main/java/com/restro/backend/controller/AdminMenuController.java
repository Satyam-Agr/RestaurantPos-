package com.restro.backend.controller;

import com.restro.backend.dto.AdminMenuCategoryResponse;
import com.restro.backend.dto.AdminMenuItemResponse;
import com.restro.backend.dto.CategoryIdsRequest;
import com.restro.backend.dto.CreateCategoriesBatchRequest;
import com.restro.backend.dto.CreateMenuItemsBatchRequest;
import com.restro.backend.dto.ItemIdsRequest;
import com.restro.backend.dto.UpdateCategoryRequest;
import com.restro.backend.dto.UpdateItemAvailabilityRequest;
import com.restro.backend.dto.UpdateMenuItemRequest;
import com.restro.backend.security.StaffUserDetails;
import com.restro.backend.service.AdminMenuService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/menu")
@RequiredArgsConstructor
public class AdminMenuController {

    private final AdminMenuService adminMenuService;

    @GetMapping("/categories")
    public List<AdminMenuCategoryResponse> getCategories() {
        return adminMenuService.getAllCategories();
    }

    @PostMapping("/categories")
    public List<AdminMenuCategoryResponse> createCategories(
            @Valid @RequestBody CreateCategoriesBatchRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminMenuService.createCategories(request, principal.staffUser());
    }

    @PatchMapping("/categories/{categoryId}")
    public AdminMenuCategoryResponse updateCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody UpdateCategoryRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminMenuService.updateCategory(categoryId, request, principal.staffUser());
    }

    @PostMapping("/categories/delete")
    public void deleteCategories(@Valid @RequestBody CategoryIdsRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminMenuService.deleteCategories(request, principal.staffUser());
    }

    @GetMapping("/items")
    public List<AdminMenuItemResponse> getItems() {
        return adminMenuService.getAllItems();
    }

    @PostMapping("/items")
    public List<AdminMenuItemResponse> createItems(
            @Valid @RequestBody CreateMenuItemsBatchRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminMenuService.createItems(request, principal.staffUser());
    }

    @PatchMapping("/items/{itemId}")
    public AdminMenuItemResponse updateItem(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateMenuItemRequest request,
            @AuthenticationPrincipal StaffUserDetails principal
    ) {
        return adminMenuService.updateItem(itemId, request, principal.staffUser());
    }

    @PatchMapping("/items/{itemId}/availability")
    public AdminMenuItemResponse updateAvailability(@PathVariable Long itemId, @Valid @RequestBody UpdateItemAvailabilityRequest request) {
        return adminMenuService.updateAvailability(itemId, request);
    }

    @PostMapping("/items/delete")
    public void deleteItems(@Valid @RequestBody ItemIdsRequest request, @AuthenticationPrincipal StaffUserDetails principal) {
        adminMenuService.deleteItems(request, principal.staffUser());
    }
}
