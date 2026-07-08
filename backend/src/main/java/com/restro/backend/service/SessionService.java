package com.restro.backend.service;

import com.restro.backend.domain.*;
import com.restro.backend.dto.OrderResponse;
import com.restro.backend.dto.SessionResponse;
import com.restro.backend.dto.SessionStatusResponse;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.CustomerOrderRepository;
import com.restro.backend.repository.CustomerRepository;
import com.restro.backend.repository.RestaurantTableRepository;
import com.restro.backend.repository.SessionParticipantRepository;
import com.restro.backend.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {

    private static final SecureRandom PIN_RANDOM = new SecureRandom();
    private static final List<OrderStatus> ACTIVE_ORDER_STATUSES = List.of(
            OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING,
            OrderStatus.READY, OrderStatus.SERVED, OrderStatus.BILL_REQUESTED
    );

    private final RestaurantTableRepository restaurantTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final CustomerRepository customerRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final OrderMapper orderMapper;

    @Transactional(readOnly = true)
    public SessionStatusResponse getStatus(String qrToken) {
        RestaurantTable table = restaurantTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new NotFoundException("No table found for this QR code"));
        boolean activeExists = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE).isPresent();
        return new SessionStatusResponse(table.getTableNumber(), activeExists);
    }

    @Transactional
    public SessionResponse createSession(String qrToken, Long customerId) {
        RestaurantTable table = restaurantTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new NotFoundException("No table found for this QR code"));

        if (tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE).isPresent()) {
            throw new ConflictException("An order list already exists for this table. Join it instead.");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        requireNoOtherActiveSession(customer);

        table.setStatus(TableStatus.OCCUPIED);
        restaurantTableRepository.save(table);

        TableSession session = TableSession.builder()
                .table(table)
                .sessionToken(UUID.randomUUID().toString())
                .pin(generatePin())
                .createdByCustomer(customer)
                .status(SessionStatus.ACTIVE)
                .openedAt(Instant.now())
                .build();
        session = tableSessionRepository.save(session);

        sessionParticipantRepository.save(SessionParticipant.builder()
                .tableSession(session)
                .customer(customer)
                .joinedAt(Instant.now())
                .build());

        CustomerOrder cart = CustomerOrder.builder()
                .tableSession(session)
                .status(OrderStatus.CART)
                .build();
        customerOrderRepository.save(cart);

        return toSessionResponse(session);
    }

    @Transactional
    public SessionResponse joinSession(String qrToken, String pin, Long customerId) {
        RestaurantTable table = restaurantTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new NotFoundException("No table found for this QR code"));

        TableSession session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE)
                .filter(s -> s.getPin().equals(pin))
                .orElseThrow(() -> new NotFoundException("Invalid PIN or no active order list for this table"));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));

        Optional<SessionParticipant> existing = sessionParticipantRepository.findByCustomerAndTableSession(customer, session);
        if (existing.isPresent()) {
            SessionParticipant participant = existing.get();
            if (participant.getLeftAt() != null) {
                participant.setLeftAt(null);
                sessionParticipantRepository.save(participant);
            }
        } else {
            requireNoOtherActiveSession(customer);
            sessionParticipantRepository.save(SessionParticipant.builder()
                    .tableSession(session)
                    .customer(customer)
                    .joinedAt(Instant.now())
                    .build());
        }

        return toSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public Optional<SessionResponse> getMySession(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        return sessionParticipantRepository.findByCustomerAndTableSession_StatusAndLeftAtIsNull(customer, SessionStatus.ACTIVE)
                .map(participant -> toSessionResponse(participant.getTableSession()));
    }

    @Transactional
    public void leaveMySession(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        SessionParticipant participant = sessionParticipantRepository
                .findByCustomerAndTableSession_StatusAndLeftAtIsNull(customer, SessionStatus.ACTIVE)
                .orElseThrow(() -> new ConflictException("No active session to leave"));

        TableSession session = participant.getTableSession();
        boolean isCreator = session.getCreatedByCustomer().getId().equals(customerId);
        boolean hasActiveOrder = customerOrderRepository.existsByTableSessionAndStatusIn(session, ACTIVE_ORDER_STATUSES);

        if (isCreator && hasActiveOrder) {
            throw new ConflictException("You created this table's order list and it has an order still in progress "
                    + "— you can't leave until it's served and billed. Ask someone else at the table to take over, or wait until it's done.");
        }

        participant.setLeftAt(Instant.now());
        sessionParticipantRepository.save(participant);

        if (!hasActiveOrder && !sessionParticipantRepository.existsByTableSessionAndLeftAtIsNull(session)) {
            closeSessionAndFreeTable(session);
        }
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(String sessionToken) {
        TableSession session = getActiveSessionByToken(sessionToken);
        return customerOrderRepository
                .findAllByTableSessionAndStatusNotInOrderByPlacedAtAsc(session, List.of(OrderStatus.CART))
                .stream()
                .map(orderMapper::toResponse)
                .toList();
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

    void closeSessionAndFreeTable(TableSession session) {
        session.setStatus(SessionStatus.CLOSED);
        session.setClosedAt(Instant.now());
        tableSessionRepository.save(session);

        RestaurantTable table = session.getTable();
        table.setStatus(TableStatus.AVAILABLE);
        restaurantTableRepository.save(table);
    }

    private void requireNoOtherActiveSession(Customer customer) {
        sessionParticipantRepository.findByCustomerAndTableSession_StatusAndLeftAtIsNull(customer, SessionStatus.ACTIVE)
                .ifPresent(p -> {
                    throw new ConflictException("This phone number is already part of an active order list at table "
                            + p.getTableSession().getTable().getTableNumber() + ". Leave that session first.");
                });
    }

    private SessionResponse toSessionResponse(TableSession session) {
        return new SessionResponse(session.getId(), session.getSessionToken(), session.getTable().getTableNumber(),
                session.getPin(), session.getTable().getQrToken());
    }

    private String generatePin() {
        String pin;
        do {
            pin = String.format("%04d", PIN_RANDOM.nextInt(10_000));
        } while (tableSessionRepository.existsByPinAndStatus(pin, SessionStatus.ACTIVE));
        return pin;
    }
}
