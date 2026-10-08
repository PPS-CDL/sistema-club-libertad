package com.club_libertad.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IngresosPorDeporteDTO {
    private Long deporteId;
    private String nombreDeporte;
    private Long cantidadCuotasCobradas;
    private BigDecimal totalSocial;
    private BigDecimal totalEntrenador;
    private BigDecimal totalSeguro;
    private BigDecimal montoTotal;
}