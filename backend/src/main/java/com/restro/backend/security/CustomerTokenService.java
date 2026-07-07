package com.restro.backend.security;

import com.restro.backend.domain.Customer;
import com.restro.backend.exception.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class CustomerTokenService {

    private static final String TOKEN_TYPE = "CUSTOMER";

    private final SecretKey signingKey;
    private final long expirationMs;

    public CustomerTokenService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.customer-expiration-ms}") long expirationMs
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(Customer customer) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(customer.getId().toString())
                .claim("phone", customer.getPhoneNumber())
                .claim("type", TOKEN_TYPE)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public CustomerPrincipal parseBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Customer login required");
        }
        return parseToken(authHeader.substring(7));
    }

    private CustomerPrincipal parseToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!TOKEN_TYPE.equals(claims.get("type", String.class))) {
                throw new UnauthorizedException("Invalid customer token");
            }

            Long customerId = Long.parseLong(claims.getSubject());
            String phone = claims.get("phone", String.class);
            return new CustomerPrincipal(customerId, phone);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new UnauthorizedException("Invalid or expired customer token");
        }
    }
}
