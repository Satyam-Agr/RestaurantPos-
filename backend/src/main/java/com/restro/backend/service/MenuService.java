package com.restro.backend.service;

import com.restro.backend.domain.MenuCategory;
import com.restro.backend.domain.MenuItem;
import com.restro.backend.dto.MenuCategoryResponse;
import com.restro.backend.dto.MenuItemResponse;
import com.restro.backend.repository.MenuCategoryRepository;
import com.restro.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuCategoryRepository menuCategoryRepository;
    private final MenuItemRepository menuItemRepository;

    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> getMenu() {
        List<MenuCategory> categories = menuCategoryRepository.findAllByOrderBySortOrderAsc();
        Map<Long, List<MenuItem>> itemsByCategory = menuItemRepository.findAllByAvailableTrue().stream()
                .collect(Collectors.groupingBy(item -> item.getCategory().getId()));

        return categories.stream()
                .map(category -> new MenuCategoryResponse(
                        category.getId(),
                        category.getName(),
                        itemsByCategory.getOrDefault(category.getId(), List.of()).stream()
                                .map(this::toItemResponse)
                                .toList()
                ))
                .toList();
    }

    private MenuItemResponse toItemResponse(MenuItem item) {
        return new MenuItemResponse(item.getId(), item.getName(), item.getDescription(), item.getPrice(), item.isAvailable());
    }
}
