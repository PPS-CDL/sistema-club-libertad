package com.club_libertad;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.club_libertad.models.Usuario;
import com.club_libertad.enums.RoleUsuario;
import com.club_libertad.repositories.UsuarioRepository;

@SpringBootApplication
@EnableScheduling
public class ClubLibertadApplication {

    public static void main(String[] args) {
        SpringApplication.run(ClubLibertadApplication.class, args);
    }

     @Bean
    CommandLineRunner initAdmin(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {

            if (usuarioRepository.findByUsername("admin").isEmpty()) {

                Usuario admin = new Usuario();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setEmail("admin@clublibertad.com");
                admin.setRole(RoleUsuario.ADMIN);
                admin.setActivo(true);
                admin.setIntentosFallidos(0);
                admin.setBloqueado(false);

                usuarioRepository.save(admin);

                System.out.println("✔ Usuario ADMIN creado correctamente.");
            }
        };
    }

}
