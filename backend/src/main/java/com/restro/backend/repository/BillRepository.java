package com.restro.backend.repository;

import com.restro.backend.domain.Bill;
import com.restro.backend.domain.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByTableSessionAndPaidAtIsNull(TableSession tableSession);
    Optional<Bill> findByTableSession(TableSession tableSession);
    List<Bill> findAllByPaidAtIsNull();
    List<Bill> findAllByGeneratedAtBetweenOrderByGeneratedAtDesc(Instant from, Instant to);
}
