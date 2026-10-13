package com.club_libertad.models;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "cuota_social")
@Data
public class CuotaSocial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "socio_id", nullable = false)
    @JsonIgnoreProperties({"grupoFamiliar", "socioResponsable", "deportes", "promocion"})
    private Persona socio;

    @Column(name = "tipo_cuota", nullable = false)
    private String tipoCuota; // "INDIVIDUAL" o "FAMILIAR"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_familiar_id")
    @JsonIgnoreProperties({"integrantes", "responsable"})
    private GrupoFamiliar grupoFamiliar;

    @Column(nullable = false, length = 7)
    private String periodo; // Ej: "2026-11"

    @Column(nullable = false)
    private BigDecimal monto;

    @Column(nullable = false)
    private String estado; // "PENDIENTE", "PAGADA", "VENCIDA", "CANCELADA"

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDate fechaGeneracion;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(nullable = false)
    private String concepto;


    @Column(name = "pago_id")
    private Long pagoId; 
}