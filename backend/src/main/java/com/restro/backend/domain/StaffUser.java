package com.restro.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "staff_user")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StaffRole role;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // Only meaningful for ADMIN accounts — gates sensitive overrides (force-free a table, reveal phone
    // numbers). Null until the admin sets one via PATCH /api/admin/me/pin; never defaulted in seed data.
    @Column(name = "security_pin_hash")
    private String pinHash;

    // Self-service profile fields — all optional (name above is the only required "identity" field).
    // Edited only via PATCH /api/staff/me, never by another staff member managing this account.
    private String email;

    @Column(name = "contact_number")
    private String contactNumber;

    private String address;
}
