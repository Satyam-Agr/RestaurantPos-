package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.SessionResponse;
import com.restro.backend.dto.SessionStatusResponse;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.CustomerOrderRepository;
import com.restro.backend.repository.RestaurantTableRepository;
import com.restro.backend.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {

    private static final SecureRandom PIN_RANDOM = new SecureRandom();

    private final RestaurantTableRepository restaurantTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final CustomerOrderRepository customerOrderRepository;

    @Transactional(readOnly = true)
    public SessionStatusResponse getStatus(String qrToken) {
        RestaurantTable table = restaurantTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new NotFoundException("No table found for this QR code"));
        boolean activeExists = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE).isPresent();
        return new SessionStatusResponse(table.getTableNumber(), activeExists);
    }

    @Transactional
    public SessionResponse createSession(String qrToken) {
        RestaurantTable table = restaurantTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new NotFoundException("No table found for this QR code"));

        if (tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE).isPresent()) {
            throw new ConflictException("An order list already exists for this table. Join it instead.");
        }

        table.setStatus(TableStatus.OCCUPIED);
        restaurantTableRepository.save(table);

        TableSession session = TableSession.builder()
                .table(table)
                .sessionToken(UUID.randomUUID().toString())
                .pin(generatePin())
                .status(SessionStatus.ACTIVE)
                .openedAt(Instant.now())
                .build();
        session = tableSessionRepository.save(session);

        CustomerOrder cart = CustomerOrder.builder()
                .tableSession(session)
                .status(OrderStatus.CART)
                .build();
        customerOrderRepository.save(cart);

        return new SessionResponse(session.getId(), session.getSessionToken(), table.getTableNumber(), session.getPin());
    }

    @Transactional
    public SessionResponse joinSession(String qrToken, String pin) {
        RestaurantTable table = restaurantTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new NotFoundException("No table found for this QR code"));

        TableSession session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE)
                .filter(s -> s.getPin().equals(pin))
                .orElseThrow(() -> new NotFoundException("Invalid PIN or no active order list for this table"));

        return new SessionResponse(session.getId(), session.getSessionToken(), table.getTableNumber(), session.getPin());
    }

    @Transactional(readOnly = true)
    public TableSession getActiveSessionByToken(String sessionToken) {
        TableSession session = tableSessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new NotFoundException("Session not found"));
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new NotFoundException("Session is no longer active");
        }
        return session;
    }

    private String generatePin() {
        String pin;
        do {
            pin = String.format("%04d", PIN_RANDOM.nextInt(10_000));
        } while (tableSessionRepository.existsByPinAndStatus(pin, SessionStatus.ACTIVE));
        return pin;
    }
}
