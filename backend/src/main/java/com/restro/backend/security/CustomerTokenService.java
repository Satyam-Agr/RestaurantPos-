package com.restro.backend.security;

import com.restro.backend.domain.Customer;
import com.restro.backend.domain.RevokedCustomerToken;
import com.restro.backend.exception.UnauthorizedException;
import com.restro.backend.repository.RevokedCustomerTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class CustomerTokenService {

    private static final String TOKEN_TYPE = "CUSTOMER";

    private final RevokedCustomerTokenRepository revokedCustomerTokenRepository;
    private final SecretKey signingKey;
    private final long expirationMs;

    public CustomerTokenService(
            RevokedCustomerTokenRepository revokedCustomerTokenRepository,
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.customer-expiration-ms}") long expirationMs
    ) {
        this.revokedCustomerTokenRepository = revokedCustomerTokenRepository;
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(Customer customer) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(customer.getId().toString())
                .claim("phone", customer.getPhoneNumber())
                .claim("type", TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public CustomerPrincipal parseBearerToken(String authHeader) {
        Claims claims = parseValidClaims(authHeader);
        Long customerId = Long.parseLong(claims.getSubject());
        String phone = claims.get("phone", String.class);
        return new CustomerPrincipal(customerId, phone);
    }

    public void revokeBearerToken(String authHeader) {
        Claims claims = parseValidClaims(authHeader);
        revokedCustomerTokenRepository.save(RevokedCustomerToken.builder()
                .jti(claims.getId())
                .revokedAt(Instant.now())
                .expiresAt(claims.getExpiration().toInstant())
                .build());
    }

    private Claims parseValidClaims(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Customer login required");
        }
        String token = authHeader.substring(7);

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!TOKEN_TYPE.equals(claims.get("type", String.class))) {
                throw new UnauthorizedException("Invalid customer token");
            }
            if (revokedCustomerTokenRepository.existsById(claims.getId())) {
                throw new UnauthorizedException("This session has been logged out");
            }
            return claims;
        } catch (JwtException | IllegalArgumentException ex) {
            throw new UnauthorizedException("Invalid or expired customer token");
        }
    }
}
