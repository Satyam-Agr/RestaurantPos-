package com.restro.backend.service;

import com.restro.backend.domain.CustomizationGroup;
import com.restro.backend.domain.CustomizationOption;
import com.restro.backend.domain.MenuCategory;
import com.restro.backend.domain.MenuItem;
import com.restro.backend.domain.StaffUser;
import com.restro.backend.dto.AdminMenuCategoryResponse;
import com.restro.backend.dto.AdminMenuItemResponse;
import com.restro.backend.dto.CategoryIdsRequest;
import com.restro.backend.dto.CreateCategoriesBatchRequest;
import com.restro.backend.dto.CreateCategoryRequest;
import com.restro.backend.dto.CreateCustomizationGroupRequest;
import com.restro.backend.dto.CreateCustomizationGroupsBatchRequest;
import com.restro.backend.dto.CreateCustomizationOptionRequest;
import com.restro.backend.dto.CreateCustomizationOptionsBatchRequest;
import com.restro.backend.dto.CreateMenuItemRequest;
import com.restro.backend.dto.CreateMenuItemsBatchRequest;
import com.restro.backend.dto.CustomizationGroupIdsRequest;
import com.restro.backend.dto.CustomizationGroupResponse;
import com.restro.backend.dto.CustomizationOptionIdsRequest;
import com.restro.backend.dto.CustomizationOptionResponse;
import com.restro.backend.dto.ItemIdsRequest;
import com.restro.backend.dto.UpdateCategoryRequest;
import com.restro.backend.dto.UpdateCustomizationGroupRequest;
import com.restro.backend.dto.UpdateCustomizationOptionRequest;
import com.restro.backend.dto.UpdateItemAvailabilityRequest;
import com.restro.backend.dto.UpdateMenuItemRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.CustomizationGroupRepository;
import com.restro.backend.repository.CustomizationOptionRepository;
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
    private final CustomizationGroupRepository customizationGroupRepository;
    private final CustomizationOptionRepository customizationOptionRepository;
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
                .dietaryType(request.dietaryType())
                .allergens(request.allergens())
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
        if (request.dietaryType() != null) {
            item.setDietaryType(request.dietaryType());
        }
        if (request.allergens() != null) {
            item.setAllergens(request.allergens());
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

    @Transactional
    public List<CustomizationGroupResponse> createCustomizationGroups(Long itemId, CreateCustomizationGroupsBatchRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        MenuItem item = requireItem(itemId);
        return request.groups().stream()
                .map(g -> buildGroup(item, g))
                .map(customizationGroupRepository::save)
                .map(this::toGroupResponse)
                .toList();
    }

    private CustomizationGroup buildGroup(MenuItem item, CreateCustomizationGroupRequest request) {
        CustomizationGroup group = CustomizationGroup.builder()
                .menuItem(item)
                .name(request.name())
                .type(request.type())
                .required(request.required())
                .build();
        request.options().forEach(o -> group.getOptions().add(buildOption(group, o)));
        return group;
    }

    @Transactional
    public CustomizationGroupResponse updateCustomizationGroup(Long groupId, UpdateCustomizationGroupRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        CustomizationGroup group = requireGroup(groupId);
        if (request.name() != null) {
            group.setName(request.name());
        }
        if (request.type() != null) {
            group.setType(request.type());
        }
        if (request.required() != null) {
            group.setRequired(request.required());
        }
        return toGroupResponse(customizationGroupRepository.save(group));
    }

    @Transactional
    public void deleteCustomizationGroups(CustomizationGroupIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        List<CustomizationGroup> groups = request.groupIds().stream().map(this::requireGroup).toList();
        customizationGroupRepository.deleteAll(groups);
    }

    @Transactional
    public List<CustomizationOptionResponse> createCustomizationOptions(Long groupId, CreateCustomizationOptionsBatchRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        CustomizationGroup group = requireGroup(groupId);
        return request.options().stream()
                .map(o -> buildOption(group, o))
                .map(customizationOptionRepository::save)
                .map(o -> new CustomizationOptionResponse(o.getId(), o.getName(), o.getPriceDelta()))
                .toList();
    }

    private CustomizationOption buildOption(CustomizationGroup group, CreateCustomizationOptionRequest request) {
        return CustomizationOption.builder()
                .group(group)
                .name(request.name())
                .priceDelta(request.priceDelta())
                .build();
    }

    @Transactional
    public CustomizationOptionResponse updateCustomizationOption(Long optionId, UpdateCustomizationOptionRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        CustomizationOption option = requireOption(optionId);
        if (request.name() != null) {
            option.setName(request.name());
        }
        if (request.priceDelta() != null) {
            option.setPriceDelta(request.priceDelta());
        }
        option = customizationOptionRepository.save(option);
        return new CustomizationOptionResponse(option.getId(), option.getName(), option.getPriceDelta());
    }

    @Transactional
    public void deleteCustomizationOptions(CustomizationOptionIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        List<CustomizationOption> options = request.optionIds().stream().map(this::requireOption).toList();
        customizationOptionRepository.deleteAll(options);
    }

    private CustomizationGroup requireGroup(Long groupId) {
        return customizationGroupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Customization group " + groupId + " not found"));
    }

    private CustomizationOption requireOption(Long optionId) {
        return customizationOptionRepository.findById(optionId)
                .orElseThrow(() -> new NotFoundException("Customization option " + optionId + " not found"));
    }

    private CustomizationGroupResponse toGroupResponse(CustomizationGroup group) {
        List<CustomizationOptionResponse> options = group.getOptions().stream()
                .map(o -> new CustomizationOptionResponse(o.getId(), o.getName(), o.getPriceDelta()))
                .toList();
        return new CustomizationGroupResponse(group.getId(), group.getName(), group.getType(), group.isRequired(), options);
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
        List<CustomizationGroupResponse> groups = customizationGroupRepository.findAllByMenuItemOrderBySortOrderAsc(item).stream()
                .map(this::toGroupResponse)
                .toList();
        return new AdminMenuItemResponse(
                item.getId(), item.getCategory().getId(), item.getCategory().getName(),
                item.getName(), item.getDescription(), item.getPrice(), item.getImageUrl(), item.isAvailable(),
                item.getDietaryType(), item.getAllergens(), groups
        );
    }
}
