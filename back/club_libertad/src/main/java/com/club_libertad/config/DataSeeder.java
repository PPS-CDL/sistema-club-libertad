package com.club_libertad.config;

import com.club_libertad.enums.RoleUsuario;
import com.club_libertad.services.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {
    @Bean
    CommandLineRunner seedUsers(AuthService authService) {
        return args -> {
            // Create admin and secretario if they do not exist
            authService.createUser("admin", "admin123", RoleUsuario.ADMIN);
            authService.createUser("secretario", "secret123", RoleUsuario.SECRETARIO);
        };
    }
}
