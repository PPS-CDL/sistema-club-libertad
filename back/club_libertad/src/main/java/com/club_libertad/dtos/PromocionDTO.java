package com.club_libertad.dtos;

import com.club_libertad.enums.TipoDescuento;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class PromocionDTO {
    public String nombre;
    public String descripcion;
    public TipoDescuento tipoDescuento;
    public BigDecimal descuento;
    public Boolean activo;
}
