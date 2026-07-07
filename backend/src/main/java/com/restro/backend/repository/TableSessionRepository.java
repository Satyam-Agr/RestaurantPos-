package com.restro.backend.repository;

import com.restro.backend.domain.RestaurantTable;
import com.restro.backend.domain.SessionStatus;
import com.restro.backend.domain.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TableSessionRepository extends JpaRepository<TableSession, Long> {
    Optional<TableSession> findByTableAndStatus(RestaurantTable table, SessionStatus status);
    Optional<TableSession> findBySessionToken(String sessionToken);
    boolean existsByPinAndStatus(String pin, SessionStatus status);
}
