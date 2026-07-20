package com.restro.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

// One row per paid bill that included a tip — the running ledger management pools and splits among
// staff at the end of the day/shift. Plain sessionId/tableNumber snapshot (not a live FK) so this
// stays a permanent record even though sessions get closed and tables can be renamed.
@Entity
@Table(name = "tip_pool_entry")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipPoolEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bill_id", nullable = false)
    private Long billId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "table_number", nullable = false)
    private String tableNumber;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;
}
