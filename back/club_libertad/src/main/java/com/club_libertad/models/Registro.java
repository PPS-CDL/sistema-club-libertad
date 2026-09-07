package com.club_libertad.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.ZonedDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "registro")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Registro {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false, unique = true)
    private String dni;

    @Column(name = "fecha_registro", nullable = false)
    private ZonedDateTime fechaRegistro;

    @Column(name = "fecha_baja")
    private ZonedDateTime fechaBaja;

    @Column(name = "observacion_baja", columnDefinition = "TEXT")
    private String observacionBaja;
}