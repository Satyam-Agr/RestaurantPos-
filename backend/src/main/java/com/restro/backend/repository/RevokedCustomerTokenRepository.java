package com.restro.backend.repository;

import com.restro.backend.domain.RevokedCustomerToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RevokedCustomerTokenRepository extends JpaRepository<RevokedCustomerToken, String> {
}
