package com.restro.backend.service;

import com.restro.backend.domain.Customer;
import com.restro.backend.dto.CustomerLoginResponse;
import com.restro.backend.repository.CustomerRepository;
import com.restro.backend.security.CustomerTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerTokenService customerTokenService;

    @Transactional
    public CustomerLoginResponse login(String phoneNumber) {
        Customer customer = customerRepository.findByPhoneNumber(phoneNumber)
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .phoneNumber(phoneNumber)
                        .createdAt(Instant.now())
                        .build()));

        String token = customerTokenService.generateToken(customer);
        return new CustomerLoginResponse(token, customer.getId(), customer.getPhoneNumber());
    }
}
