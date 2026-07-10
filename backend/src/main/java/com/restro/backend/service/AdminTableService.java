package com.restro.backend.service;

import com.restro.backend.domain.RestaurantTable;
import com.restro.backend.domain.SessionParticipant;
import com.restro.backend.domain.SessionStatus;
import com.restro.backend.domain.StaffUser;
import com.restro.backend.domain.TableSession;
import com.restro.backend.domain.TableStatus;
import com.restro.backend.dto.BillResponse;
import com.restro.backend.dto.CreateTableRequest;
import com.restro.backend.dto.CreateTablesBatchRequest;
import com.restro.backend.dto.OrderStatusEventResponse;
import com.restro.backend.dto.ParticipantResponse;
import com.restro.backend.dto.TableIdsRequest;
import com.restro.backend.dto.TableManagementResponse;
import com.restro.backend.dto.UpdateTableRequest;
import com.restro.backend.exception.ConflictException;
import com.restro.backend.exception.NotFoundException;
import com.restro.backend.repository.OrderStatusEventRepository;
import com.restro.backend.repository.RestaurantTableRepository;
import com.restro.backend.repository.SessionParticipantRepository;
import com.restro.backend.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminTableService {

    private final RestaurantTableRepository restaurantTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final OrderStatusEventRepository orderStatusEventRepository;
    private final SessionService sessionService;
    private final AdminService adminService;
    private final BillService billService;

    @Transactional
    public void freeSession(Long tableId, String pin, StaffUser admin) {
        adminService.verifyPin(admin, pin);
        sessionService.forceCloseSessionForTable(tableId);
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> revealParticipants(Long tableId, String pin, StaffUser admin) {
        adminService.verifyPin(admin, pin);

        RestaurantTable table = restaurantTableRepository.findById(tableId)
                .orElseThrow(() -> new NotFoundException("Table " + tableId + " not found"));
        TableSession session = tableSessionRepository.findByTableAndStatus(table, SessionStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("No active session for this table"));

        Long creatorId = session.getCreatedByCustomer() != null ? session.getCreatedByCustomer().getId() : null;
        return sessionParticipantRepository.findAllByTableSessionOrderByJoinedAtAsc(session).stream()
                .map(p -> toParticipantResponse(p, creatorId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderStatusEventResponse> getOrderHistory(Long orderId) {
        return orderStatusEventRepository.findAllByOrderIdOrderByChangedAtAsc(orderId).stream()
                .map(e -> new OrderStatusEventResponse(
                        e.getOrderId(), e.getFromStatus(), e.getToStatus(),
                        e.getChangedBy() != null ? e.getChangedBy().getName() : null,
                        e.getChangedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BillResponse> getBillHistory(Instant from, Instant to) {
        return billService.getBillHistory(from != null ? from : Instant.EPOCH, to != null ? to : Instant.now());
    }

    @Transactional(readOnly = true)
    public List<TableManagementResponse> getRoster() {
        return restaurantTableRepository.findAll().stream().map(this::toManagementResponse).toList();
    }

    @Transactional
    public List<TableManagementResponse> createTables(CreateTablesBatchRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        return request.tables().stream()
                .map(this::buildTable)
                .map(restaurantTableRepository::save)
                .map(this::toManagementResponse)
                .toList();
    }

    private RestaurantTable buildTable(CreateTableRequest request) {
        return RestaurantTable.builder()
                .tableNumber(request.tableNumber())
                .qrToken(UUID.randomUUID().toString())
                .status(TableStatus.AVAILABLE)
                .retired(false)
                .build();
    }

    @Transactional
    public TableManagementResponse renameTable(Long tableId, UpdateTableRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        RestaurantTable table = requireTable(tableId);
        table.setTableNumber(request.tableNumber());
        return toManagementResponse(restaurantTableRepository.save(table));
    }

    @Transactional
    public void retireTables(TableIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());

        List<RestaurantTable> tables = request.tableIds().stream().map(this::requireTable).toList();
        List<String> blocked = tables.stream()
                .filter(t -> tableSessionRepository.findByTableAndStatus(t, SessionStatus.ACTIVE).isPresent())
                .map(RestaurantTable::getTableNumber)
                .toList();
        if (!blocked.isEmpty()) {
            throw new ConflictException("These tables have an active session — free them first before retiring: "
                    + String.join(", ", blocked));
        }
        tables.forEach(t -> t.setRetired(true));
        restaurantTableRepository.saveAll(tables);
    }

    @Transactional
    public void reactivateTables(TableIdsRequest request, StaffUser actingAdmin) {
        adminService.verifyPin(actingAdmin, request.pin());
        List<RestaurantTable> tables = request.tableIds().stream().map(this::requireTable).toList();
        tables.forEach(t -> t.setRetired(false));
        restaurantTableRepository.saveAll(tables);
    }

    private RestaurantTable requireTable(Long tableId) {
        return restaurantTableRepository.findById(tableId)
                .orElseThrow(() -> new NotFoundException("Table " + tableId + " not found"));
    }

    private TableManagementResponse toManagementResponse(RestaurantTable table) {
        return new TableManagementResponse(
                table.getId(), table.getTableNumber(), table.getQrToken(), table.getStatus(),
                Boolean.TRUE.equals(table.getRetired())
        );
    }

    private ParticipantResponse toParticipantResponse(SessionParticipant participant, Long creatorId) {
        boolean isCreator = creatorId != null && creatorId.equals(participant.getCustomer().getId());
        return new ParticipantResponse(
                participant.getCustomer().getId(),
                participant.getCustomer().getPhoneNumber(),
                participant.getJoinedAt(),
                participant.getLeftAt(),
                isCreator
        );
    }
}
