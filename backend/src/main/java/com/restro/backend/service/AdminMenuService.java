package com.restro.backend.service;

import com.restro.backend.domain.MenuCategory;
import com.restro.backend.domain.MenuItem;
import com.restro.backend.domain.StaffUser;
import com.restro.backend.dto.AdminMenuCategoryResponse;
import com.restro.backend.dto.AdminMenuItemResponse;
import com.restro.backend.dto.CategoryIdsRequest;
import com.restro.backend.dto.CreateCategoriesBatchRequest;
import com.restro.backend.dto.CreateCategoryRequest;
import com.restro.backend.dto.CreateMenuItemRequest;
import com.restro.backend.dto.CreateMenuItemsBatchRequest;
import com.restro.backend.dto.ItemIdsRequest;
import com.restro.backend.dto.UpdateCategoryRequest;
import com.restro.backend.dto.UpdateItemAvailabilityRequest;
import com.restro.backend.dto.UpdateMenuItemRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.MenuCategoryRepository;
import com.restro.backend.repository.MenuItemRepository;
import com.restro.backend.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminMenuService {

    private final MenuCategoryRepository menuCategoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderItemRepository orderItemRepository;
    private final AdminService adminService;

    @Transactional(readOnly = true)
    public List<AdminMenuCategoryResponse> getAllCategories() {
        return menuCategoryRepository.findAllByOrderBySortOrderAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<AdminMenuCategoryResponse> createCategories(CreateCategoriesBatchRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        return request.categories().stream()
                .map(this::buildCategory)
                .map(menuCategoryRepository::save)
                .map(this::toResponse)
                .toList();
    }

    private MenuCategory buildCategory(CreateCategoryRequest request) {
        return MenuCategory.builder()
                .name(request.name())
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .build();
    }

    @Transactional
    public AdminMenuCategoryResponse updateCategory(Long categoryId, UpdateCategoryRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        MenuCategory category = requireCategory(categoryId);
        if (request.name() != null) {
            category.setName(request.name());
        }
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        return toResponse(menuCategoryRepository.save(category));
    }

    @Transactional
    public void deleteCategories(CategoryIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());

        List<MenuCategory> categories = request.categoryIds().stream().map(this::requireCategory).toList();
        List<String> blocked = categories.stream()
                .filter(c -> !menuItemRepository.findAllByCategory(c).isEmpty())
                .map(MenuCategory::getName)
                .toList();
        if (!blocked.isEmpty()) {
            throw new ConflictException("These categories still have menu items — remove or reassign them first: "
                    + String.join(", ", blocked));
        }
        menuCategoryRepository.deleteAll(categories);
    }

    @Transactional(readOnly = true)
    public List<AdminMenuItemResponse> getAllItems() {
        return menuItemRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<AdminMenuItemResponse> createItems(CreateMenuItemsBatchRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        return request.items().stream()
                .map(this::buildItem)
                .map(menuItemRepository::save)
                .map(this::toResponse)
                .toList();
    }

    private MenuItem buildItem(CreateMenuItemRequest request) {
        MenuCategory category = requireCategory(request.categoryId());
        return MenuItem.builder()
                .category(category)
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .imageUrl(request.imageUrl())
                .available(request.available() == null || request.available())
                .build();
    }

    @Transactional
    public AdminMenuItemResponse updateItem(Long itemId, UpdateMenuItemRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        MenuItem item = requireItem(itemId);
        if (request.categoryId() != null) {
            item.setCategory(requireCategory(request.categoryId()));
        }
        if (request.name() != null) {
            item.setName(request.name());
        }
        if (request.description() != null) {
            item.setDescription(request.description());
        }
        if (request.price() != null) {
            item.setPrice(request.price());
        }
        if (request.imageUrl() != null) {
            item.setImageUrl(request.imageUrl());
        }
        return toResponse(menuItemRepository.save(item));
    }

    // The one PIN-free admin write action — toggling availability is frequent, low-risk, and reversible.
    @Transactional
    public AdminMenuItemResponse updateAvailability(Long itemId, UpdateItemAvailabilityRequest request) {
        MenuItem item = requireItem(itemId);
        item.setAvailable(request.available());
        return toResponse(menuItemRepository.save(item));
    }

    @Transactional
    public void deleteItems(ItemIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());

        List<MenuItem> items = request.itemIds().stream().map(this::requireItem).toList();
        List<String> blocked = items.stream()
                .filter(orderItemRepository::existsByMenuItem)
                .map(MenuItem::getName)
                .toList();
        if (!blocked.isEmpty()) {
            throw new ConflictException("These items are part of an in-progress order and can't be deleted — mark them unavailable instead: "
                    + String.join(", ", blocked));
        }
        menuItemRepository.deleteAll(items);
    }

    private MenuCategory requireCategory(Long categoryId) {
        return menuCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Menu category " + categoryId + " not found"));
    }

    private MenuItem requireItem(Long itemId) {
        return menuItemRepository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Menu item " + itemId + " not found"));
    }

    private AdminMenuCategoryResponse toResponse(MenuCategory category) {
        return new AdminMenuCategoryResponse(category.getId(), category.getName(), category.getSortOrder());
    }

    private AdminMenuItemResponse toResponse(MenuItem item) {
        return new AdminMenuItemResponse(
                item.getId(), item.getCategory().getId(), item.getCategory().getName(),
                item.getName(), item.getDescription(), item.getPrice(), item.getImageUrl(), item.isAvailable()
        );
    }
}
