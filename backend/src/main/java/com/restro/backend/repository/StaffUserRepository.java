package com.restro.backend.repository;

import com.restro.backend.domain.StaffRole;
import com.restro.backend.domain.StaffUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaffUserRepository extends JpaRepository<StaffUser, Long> {
    Optional<StaffUser> findByUsername(String username);

    List<StaffUser> findAllByRoleAndActiveTrue(StaffRole role);
}
