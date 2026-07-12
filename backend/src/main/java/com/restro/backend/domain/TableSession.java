package com.restro.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "table_session")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "table_id", nullable = false)
    private RestaurantTable table;

    @Column(name = "session_token", nullable = false, unique = true)
    private String sessionToken;

    @Column(name = "pin", nullable = false, length = 4)
    private String pin;

    // Null for a walk-in session the waiter opened directly — see SessionService.createStaffSession.
    // The first customer to scan the table's QR "claims" it (SessionService.createSession), becoming the creator.
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "created_by_customer_id", nullable = true)
    private Customer createdByCustomer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SessionStatus status = SessionStatus.ACTIVE;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    // Waiter-only annotation for this dining session (e.g. "birthday, bring a candle") — never customer-writable.
    private String note;
}
