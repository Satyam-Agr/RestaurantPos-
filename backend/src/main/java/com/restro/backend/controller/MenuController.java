package com.restro.backend.controller;

import com.restro.backend.dto.MenuCategoryResponse;
import com.restro.backend.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    public List<MenuCategoryResponse> getMenu() {
        return menuService.getMenu();
    }
}
