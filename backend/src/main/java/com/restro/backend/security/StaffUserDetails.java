package com.restro.backend.security;

import com.restro.backend.domain.StaffUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class StaffUserDetails implements UserDetails {

    private final StaffUser staffUser;

    public StaffUserDetails(StaffUser staffUser) {
        this.staffUser = staffUser;
    }

    public StaffUser staffUser() {
        return staffUser;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + staffUser.getRole().name()));
    }

    @Override
    public String getPassword() {
        return staffUser.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return staffUser.getUsername();
    }

    @Override
    public boolean isEnabled() {
        return staffUser.isActive();
    }
}
