package com.club_libertad.dtos;

import com.club_libertad.enums.EstadoCuota;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
public class CuotaDTO {
    public Long personaId;
    public Long deporteId;
    public LocalDate periodo;
    public BigDecimal monto;
    @Enumerated(EnumType.STRING)
    public EstadoCuota estado;
    public LocalDate fechaVencimiento;
    public String concepto;
    public Long pagoId;
}
