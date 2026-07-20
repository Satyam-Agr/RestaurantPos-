package com.restro.backend.repository;

import com.restro.backend.domain.TipPoolEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface TipPoolEntryRepository extends JpaRepository<TipPoolEntry, Long> {
    List<TipPoolEntry> findAllByRecordedAtBetweenOrderByRecordedAtAsc(Instant from, Instant to);
}
