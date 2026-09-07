package com.club_libertad.models;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Entity
@Table(name = "inscripcion")
@Data
@NoArgsConstructor
public class Inscripcion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "persona_id", nullable = false)
    private Persona personaId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deporte_id", nullable = false)
    private Deporte deporteId;
    @Column(name = "fecha_inscripcion", nullable = false)
    private LocalDate fechaInscripcion;
    @Column(name = "fecha_baja")
    private LocalDate fechaBaja;
}
