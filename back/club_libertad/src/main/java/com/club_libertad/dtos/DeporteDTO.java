package com.club_libertad.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class DeporteDTO {
    public String nombre;
    public String descripcion;
    public BigDecimal cuotaEntrenador;
    public BigDecimal cuotaSeguro;
    public BigDecimal cuotaSocial;
}
