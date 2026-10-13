package com.club_libertad.services;
import com.club_libertad.dtos.ConfiguracionClubDTO;
import com.club_libertad.models.ConfiguracionClub;
import com.club_libertad.repositories.ConfiguracionClubRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class ConfiguracionClubService {

    private final ConfiguracionClubRepository configuracionRepository;
    

    public ConfiguracionClubService(ConfiguracionClubRepository configuracionRepository) {
        this.configuracionRepository = configuracionRepository;
    }

    @Transactional(readOnly = true)
    public ConfiguracionClub getConfiguracion() {
        return configuracionRepository.findById(1L).orElseGet(this::inicializarConfiguracionEnBlanco);
    }

    @Transactional
    public ConfiguracionClub inicializarConfiguracionEnBlanco() {
        ConfiguracionClub config = new ConfiguracionClub();
        config.setId(1L);
        config.setImporteCuotaIndividual(BigDecimal.ZERO);
        config.setImporteCuotaFamiliar(BigDecimal.ZERO);
        config.setFechaEfectiva(null);
        return configuracionRepository.save(config);
    }

    @Transactional
    public ConfiguracionClub updateConfiguracion(ConfiguracionClubDTO dto) {
        ConfiguracionClub config = getConfiguracion();

        // Validaciones de importes
        if (dto.getImporteCuotaIndividual() != null) {
            if (dto.getImporteCuotaIndividual().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("El importe de la cuota individual no puede ser negativo.");
            }
            config.setImporteCuotaIndividual(dto.getImporteCuotaIndividual());
        }

        if (dto.getImporteCuotaFamiliar() != null) {
            if (dto.getImporteCuotaFamiliar().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("El importe de la cuota familiar no puede ser negativo.");
            }
            config.setImporteCuotaFamiliar(dto.getImporteCuotaFamiliar());
        }

        // Validaciones de Fecha Efectiva
        LocalDate nuevaFecha = dto.getFechaEfectiva();
        LocalDate fechaActual = config.getFechaEfectiva();

        if (nuevaFecha != null && !nuevaFecha.equals(fechaActual)) {
            LocalDate hoy = LocalDate.now();

            // Bloqueo de modificación si la fecha actual ya se alcanzó (o se superó)
            if (fechaActual != null && !hoy.isBefore(fechaActual)) {
                throw new IllegalStateException("La fecha efectiva ya se alcanzó y no puede ser modificada.");
            }

           
            // Debe ser el primer día de un mes
            if (nuevaFecha.getDayOfMonth() != 1) {
                throw new IllegalArgumentException("La fecha efectiva debe configurarse para el primer día de un mes.");
            }

            // No puede ser retroactiva
            if (nuevaFecha.isBefore(hoy)) {
                throw new IllegalArgumentException("La fecha efectiva no puede ser una fecha pasada.");
            }

            config.setFechaEfectiva(nuevaFecha);
        }

        return configuracionRepository.save(config);
    }
}