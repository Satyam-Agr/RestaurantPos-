package com.restro.backend.controller;

import com.restro.backend.dto.CustomerLoginRequest;
import com.restro.backend.dto.CustomerLoginResponse;
import com.restro.backend.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping("/login")
    public CustomerLoginResponse login(@Valid @RequestBody CustomerLoginRequest request) {
        return customerService.login(request.phoneNumber());
    }
}
