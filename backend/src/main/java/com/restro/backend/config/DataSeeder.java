package com.restro.backend.config;

import com.restro.backend.domain.*;
import com.restro.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Seeds a handful of tables, a sample menu, and one staff login per role on first startup,
 * so the workflow can be exercised end-to-end without a separate admin UI.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RestaurantTableRepository tableRepository;
    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final StaffUserRepository staffUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedTables();
        seedMenu();
        seedStaff();
    }

    private void seedTables() {
        if (tableRepository.count() > 0) {
            return;
        }
        for (int i = 1; i <= 5; i++) {
            tableRepository.save(RestaurantTable.builder()
                    .tableNumber("T" + i)
                    .qrToken(UUID.randomUUID().toString())
                    .status(TableStatus.AVAILABLE)
                    .build());
        }
    }

    private void seedMenu() {
        if (categoryRepository.count() > 0) {
            return;
        }
        MenuCategory starters = categoryRepository.save(MenuCategory.builder().name("Starters").sortOrder(1).build());
        MenuCategory mains = categoryRepository.save(MenuCategory.builder().name("Main Course").sortOrder(2).build());
        MenuCategory beverages = categoryRepository.save(MenuCategory.builder().name("Beverages").sortOrder(3).build());

        menuItemRepository.save(MenuItem.builder().category(starters).name("Paneer Tikka").description("Grilled cottage cheese skewers").price(new BigDecimal("220.00")).imageUrl("https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/paneer_azoymi.jpg").available(true).build());
        menuItemRepository.save(MenuItem.builder().category(starters).name("Veg Spring Rolls").description("Crispy vegetable rolls").price(new BigDecimal("180.00")).imageUrl("https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418186/chole_thfufw.jpg").available(true).build());
        menuItemRepository.save(MenuItem.builder().category(mains).name("Butter Chicken").description("Creamy tomato chicken curry").price(new BigDecimal("340.00")).imageUrl("https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418186/biryani_bna4mp.jpg").available(true).build());
        menuItemRepository.save(MenuItem.builder().category(mains).name("Dal Makhani").description("Slow-cooked black lentils").price(new BigDecimal("260.00")).imageUrl("https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/kofta_xv19ou.jpg").available(true).build());
        menuItemRepository.save(MenuItem.builder().category(beverages).name("Masala Chai").description("Spiced Indian tea").price(new BigDecimal("60.00")).imageUrl("https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/dhosa_j1jaf4.jpg").available(true).build());
        menuItemRepository.save(MenuItem.builder().category(beverages).name("Fresh Lime Soda").description("Sweet or salted").price(new BigDecimal("80.00")).imageUrl("https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/fullplate_huhfwx.jpg").available(true).build());
    }

    private void seedStaff() {
        if (staffUserRepository.count() > 0) {
            return;
        }
        staffUserRepository.save(StaffUser.builder().name("Waiter One").username("waiter1").passwordHash(passwordEncoder.encode("password123")).role(StaffRole.WAITER).active(true)
                .email("waiter1@restropos.example").contactNumber("9800000001").address("12 Staff Quarters, City").build());
        staffUserRepository.save(StaffUser.builder().name("Kitchen One").username("kitchen1").passwordHash(passwordEncoder.encode("password123")).role(StaffRole.KITCHEN).active(true)
                .email("kitchen1@restropos.example").contactNumber("9800000002").address("14 Staff Quarters, City").build());
        staffUserRepository.save(StaffUser.builder().name("Cashier One").username("cashier1").passwordHash(passwordEncoder.encode("password123")).role(StaffRole.CASHIER).active(true)
                .email("cashier1@restropos.example").contactNumber("9800000003").address("16 Staff Quarters, City").build());
        staffUserRepository.save(StaffUser.builder().name("Admin One").username("admin1").passwordHash(passwordEncoder.encode("password123")).role(StaffRole.ADMIN).active(true)
                .email("admin1@restropos.example").contactNumber("9800000004").address("1 Manager's House, City").build());
    }
}
