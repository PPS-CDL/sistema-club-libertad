package com.club_libertad.models;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/*
 Configuración global del club
 Persiste los importes configurables de las cuotas sociales (individual y familiar) y 
 la fecha efectiva de transición al nuevo esquema de cuotas independientes.
*/
@Entity
@Table(name = "configuracion_club")
@Data
public class ConfiguracionClub {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "importe_cuota_individual", nullable = false)
    private BigDecimal importeCuotaIndividual;

    @Column(name = "importe_cuota_familiar", nullable = false)
    private BigDecimal importeCuotaFamiliar;

    @Column(name = "fecha_efectiva")
    private LocalDate fechaEfectiva;
}