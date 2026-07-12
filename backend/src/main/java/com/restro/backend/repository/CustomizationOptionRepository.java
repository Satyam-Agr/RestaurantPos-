package com.restro.backend.repository;

import com.restro.backend.domain.CustomizationOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomizationOptionRepository extends JpaRepository<CustomizationOption, Long> {
}
