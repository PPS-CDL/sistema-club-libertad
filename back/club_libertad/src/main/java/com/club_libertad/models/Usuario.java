package com.club_libertad.models;

import com.club_libertad.enums.RoleUsuario;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "usuario")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "username", unique = true, nullable = false)
    private String username;
    @Column(name = "password_hash", nullable = false)
    private String password;
    @Column(name = "email", unique = true)
    private String email;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleUsuario role;
    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "intentos_fallidos", nullable = false, columnDefinition = "integer default 0")
    private Integer intentosFallidos = 0;

    @Column(name = "bloqueado", nullable = false, columnDefinition = "boolean default false")
    private Boolean bloqueado = false;

    @Column(name = "ultimo_acceso")
    private java.time.ZonedDateTime ultimoAcceso;

    @Column(name = "ultimo_intento_fallido")
    private java.time.ZonedDateTime ultimoIntentoFallido;
}
