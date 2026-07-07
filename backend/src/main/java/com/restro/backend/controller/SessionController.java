package com.restro.backend.controller;

import com.restro.backend.dto.JoinSessionRequest;
import com.restro.backend.dto.SessionResponse;
import com.restro.backend.dto.SessionStatusResponse;
import com.restro.backend.security.CustomerPrincipal;
import com.restro.backend.security.CustomerTokenService;
import com.restro.backend.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final CustomerTokenService customerTokenService;

    @GetMapping("/status/{qrToken}")
    public SessionStatusResponse status(@PathVariable String qrToken) {
        return sessionService.getStatus(qrToken);
    }

    @PostMapping("/create/{qrToken}")
    public SessionResponse create(
            @PathVariable String qrToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        CustomerPrincipal customer = customerTokenService.parseBearerToken(authHeader);
        return sessionService.createSession(qrToken, customer.customerId());
    }

    @PostMapping("/join/{qrToken}")
    public SessionResponse join(
            @PathVariable String qrToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody JoinSessionRequest request
    ) {
        customerTokenService.parseBearerToken(authHeader);
        return sessionService.joinSession(qrToken, request.pin());
    }
}
