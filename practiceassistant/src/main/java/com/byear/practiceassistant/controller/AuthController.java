package com.byear.practiceassistant.controller;

import com.byear.practiceassistant.security.JwtResponse;
import com.byear.practiceassistant.security.LoginRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtEncoder jwtEncoder;

    public AuthController(AuthenticationManager authManager, JwtEncoder jwtEncoder) {
        this.authManager = authManager;
        this.jwtEncoder = jwtEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        Authentication authentication = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        // Extract roles from authenticated user
        List<String> roles = authentication.getAuthorities().stream()
                .map(granted -> granted.getAuthority().replace("ROLE_", ""))
                .toList();

        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("self")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .subject(authentication.getName())
                .claim("roles", roles)
                .build();

        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(claims)
        ).getTokenValue();

        return ResponseEntity.ok(new JwtResponse(token));
    }
}

