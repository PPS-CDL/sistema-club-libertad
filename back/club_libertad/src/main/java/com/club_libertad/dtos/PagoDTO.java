package com.club_libertad.dtos;

import com.club_libertad.enums.MetodoPago;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
public class PagoDTO {
    private Long socioId;  
    public LocalDate fechaPago;
    public BigDecimal montoTotal;
    @Enumerated(EnumType.STRING)
    public MetodoPago metodoPago;
    private String observaciones;
    private List<Long> cuotaIds;
}
