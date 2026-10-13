package com.club_libertad.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumenMensualPorDeporteDTO {
    private Long deporteId;
    private String nombreDeporte;
    
    // Contadores de personas únicas
    private Long sociosAlDia;
    private Long sociosDeudores;

    // Totales monetarios netos
    private BigDecimal totalCobrado;
    private BigDecimal totalAdeudado;

    // Desglose de cobrados
    private BigDecimal cobradoSocial;
    private BigDecimal cobradoEntrenador;
    private BigDecimal cobradoSeguro;

    // Desglose de adeudados
    private BigDecimal adeudadoSocial;
    private BigDecimal adeudadoEntrenador;
    private BigDecimal adeudadoSeguro;
}