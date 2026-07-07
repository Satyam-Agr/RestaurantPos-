package com.restro.backend.controller;

import com.restro.backend.dto.JoinSessionRequest;
import com.restro.backend.dto.SessionResponse;
import com.restro.backend.dto.SessionStatusResponse;
import com.restro.backend.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping("/status/{qrToken}")
    public SessionStatusResponse status(@PathVariable String qrToken) {
        return sessionService.getStatus(qrToken);
    }

    @PostMapping("/create/{qrToken}")
    public SessionResponse create(@PathVariable String qrToken) {
        return sessionService.createSession(qrToken);
    }

    @PostMapping("/join/{qrToken}")
    public SessionResponse join(@PathVariable String qrToken, @Valid @RequestBody JoinSessionRequest request) {
        return sessionService.joinSession(qrToken, request.pin());
    }
}
