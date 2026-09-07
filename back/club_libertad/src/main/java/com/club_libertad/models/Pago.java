package com.club_libertad.models;

import com.club_libertad.enums.MetodoPago;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "pago")
@Data
@EqualsAndHashCode(exclude = {"cuotas"})
@NoArgsConstructor
public class Pago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "socio_id", nullable = false)
    private Persona socioId;
    @Column(name = "fecha_pago",nullable = false)
    private LocalDate fechaPago;
    @Column(name = "monto_total",nullable = false, precision = 10, scale = 2, columnDefinition = "numeric(10,2) default 0")
    private BigDecimal montoTotal = BigDecimal.ZERO;
    @Column(name = "cuota_entrenador", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaEntrenador = BigDecimal.ZERO;
    @Column(name = "cuota_seguro", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaSeguro = BigDecimal.ZERO;
    @Column(name = "cuota_social", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaSocial = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago")
    private MetodoPago metodoPago;
    @Column(columnDefinition = "TEXT")
    private String observaciones;
    @JsonIgnore
    @OneToMany(mappedBy = "pagoId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Cuota> cuotas;

    @com.fasterxml.jackson.annotation.JsonProperty("socioId")
    public Long getSocioIdValue() {
        return socioId != null ? socioId.getId() : null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("cuotasIds")
    public List<Long> getCuotasIds() {
        return cuotas != null ? cuotas.stream().map(Cuota::getId).toList() : null;
    }
}
