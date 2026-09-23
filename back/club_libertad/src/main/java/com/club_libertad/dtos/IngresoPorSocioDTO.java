package com.club_libertad.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
public class IngresoPorSocioDTO {
    private Long socioId;
    private String nombre;
    private String apellido;
    private String dni;
    private BigDecimal totalPagado;
    private Long cantidadPagos;
    private LocalDate ultimoPago;

    public IngresoPorSocioDTO(Long socioId, String nombre, String apellido, String dni,
                              BigDecimal totalPagado, Long cantidadPagos, LocalDate ultimoPago) {
        this.socioId = socioId;
        this.nombre = nombre;
        this.apellido = apellido;
        this.dni = dni;
        this.totalPagado = totalPagado;
        this.cantidadPagos = cantidadPagos;
        this.ultimoPago = ultimoPago;
    }
}



