package com.restro.backend.repository;

import com.restro.backend.domain.Customer;
import com.restro.backend.domain.SessionParticipant;
import com.restro.backend.domain.SessionStatus;
import com.restro.backend.domain.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    Optional<SessionParticipant> findByCustomerAndTableSession(Customer customer, TableSession tableSession);
    Optional<SessionParticipant> findByCustomerAndTableSession_StatusAndLeftAtIsNull(Customer customer, SessionStatus status);
}
