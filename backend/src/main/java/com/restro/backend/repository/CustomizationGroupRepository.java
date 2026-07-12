package com.restro.backend.repository;

import com.restro.backend.domain.CustomizationGroup;
import com.restro.backend.domain.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomizationGroupRepository extends JpaRepository<CustomizationGroup, Long> {
    List<CustomizationGroup> findAllByMenuItemOrderBySortOrderAsc(MenuItem menuItem);
}
