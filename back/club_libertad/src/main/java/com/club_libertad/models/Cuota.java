package com.club_libertad.models;

import com.club_libertad.enums.EstadoCuota;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "cuota", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"persona_id", "deporte_id", "periodo"}, name = "uk_cuota_persona_deporte_periodo")
})
@Data
@EqualsAndHashCode(exclude = {"personaId", "deporteId", "pagoId"})
@NoArgsConstructor
public class Cuota {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "persona_id", nullable = false)
    private Persona personaId;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deporte_id", nullable = false)
    private Deporte deporteId;
    @Column(nullable = false)
    private LocalDate periodo;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;
    @Column(name = "cuota_entrenador", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaEntrenador = BigDecimal.ZERO;
    @Column(name = "cuota_seguro", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaSeguro = BigDecimal.ZERO;
    @Column(name = "cuota_social", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaSocial = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoCuota estado;
    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;
    @Column(name = "fecha_generacion", nullable = false)
    private LocalDate fechaGeneracion;
    @Column(columnDefinition = "TEXT")
    private String concepto;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pago_id")
    private Pago pagoId;

    @JsonProperty("personaId")
    public Long getPersonaIdValue() {
        return personaId != null ? personaId.getId() : null;
    }

    @JsonProperty("deporteId")
    public Long getDeporteIdValue() {
        return deporteId != null ? deporteId.getId() : null;
    }

    @JsonProperty("pagoId")
    public Long getPagoIdValue() {
        return pagoId != null ? pagoId.getId() : null;
    }
}
