package com.restro.backend.controller;

import com.restro.backend.dto.LoginRequest;
import com.restro.backend.dto.LoginResponse;
import com.restro.backend.security.JwtService;
import com.restro.backend.security.StaffUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        StaffUserDetails principal = (StaffUserDetails) authentication.getPrincipal();
        String role = principal.staffUser().getRole().name();
        String token = jwtService.generateToken(principal, role);
        return new LoginResponse(token, principal.staffUser().getName(), principal.staffUser().getRole());
    }
}
