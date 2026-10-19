package com.club_libertad.dtos;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;

@Data
public class ConfiguracionClubDTO {
    private BigDecimal importeCuotaIndividual;
    private BigDecimal importeCuotaFamiliar;
    private LocalDate fechaEfectiva;
}