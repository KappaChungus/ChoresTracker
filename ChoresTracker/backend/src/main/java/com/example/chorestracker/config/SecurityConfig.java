package com.example.chorestracker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // Disable CSRF since this is a stateless REST API
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll() // Allow anyone to access login/register
                        .requestMatchers("/api/wheel-items/**").permitAll() // Keep wheel endpoints open
                        .requestMatchers("/api/current-winner/**").permitAll() // Keep winner endpoints open
                        .requestMatchers("/api/requests/**").permitAll() // Keep request panel endpoints open
                        .requestMatchers("/api/wheel-lock/**").permitAll()
                        .anyRequest().authenticated() // Block any other request unless logged in (MUST BE LAST)
                );

        return http.build();
    }
}