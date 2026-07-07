package com.restro.backend.controller;

import com.restro.backend.dto.CustomerLoginRequest;
import com.restro.backend.dto.CustomerLoginResponse;
import com.restro.backend.dto.SessionResponse;
import com.restro.backend.security.CustomerPrincipal;
import com.restro.backend.security.CustomerTokenService;
import com.restro.backend.service.CustomerService;
import com.restro.backend.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;
    private final CustomerTokenService customerTokenService;
    private final SessionService sessionService;

    @PostMapping("/login")
    public CustomerLoginResponse login(@Valid @RequestBody CustomerLoginRequest request) {
        return customerService.login(request.phoneNumber());
    }

    @PostMapping("/logout")
    public void logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        customerTokenService.revokeBearerToken(authHeader);
    }

    @GetMapping("/me/session")
    public ResponseEntity<SessionResponse> mySession(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        CustomerPrincipal customer = customerTokenService.parseBearerToken(authHeader);
        return sessionService.getMySession(customer.customerId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/me/session/leave")
    public void leaveSession(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        CustomerPrincipal customer = customerTokenService.parseBearerToken(authHeader);
        sessionService.leaveMySession(customer.customerId());
    }
}
