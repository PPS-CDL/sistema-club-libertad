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
        // Busca el primer registro existente o lo inicializa si la tabla está vacía
        return configuracionRepository.findAll().stream()
                .findFirst()
                .orElseGet(this::inicializarConfiguracionEnBlanco);
    }

    @Transactional
    public ConfiguracionClub getConfiguracionForUpdate() {
        return configuracionRepository.findAllForUpdate().stream()
                .findFirst()
                .orElseGet(this::inicializarConfiguracionEnBlanco);
    }

    @Transactional
    public ConfiguracionClub inicializarConfiguracionEnBlanco() {
        ConfiguracionClub config = new ConfiguracionClub();
        config.setImporteCuotaIndividual(BigDecimal.ZERO);
        config.setImporteCuotaFamiliar(BigDecimal.ZERO);
        config.setFechaEfectiva(null);
        return configuracionRepository.save(config);
    }

    @Transactional
    public ConfiguracionClub updateConfiguracion(ConfiguracionClubDTO dto) {
        ConfiguracionClub config = getConfiguracionForUpdate();

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

            // Bloqueo de modificación si la fecha configurada previamente ya se alcanzó
            if (fechaActual != null && !hoy.isBefore(fechaActual)) {
                throw new IllegalStateException("La fecha efectiva ya se alcanzó y no puede ser modificada.");
            }

            // Debe ser el primer día de un mes
            if (nuevaFecha.getDayOfMonth() != 1) {
                throw new IllegalArgumentException("La fecha efectiva debe configurarse para el primer día de un mes.");
            }

            // No puede ser retroactiva a meses pasados (permite configurar el mes actual)
            LocalDate primerDiaMesActual = hoy.withDayOfMonth(1);
            if (nuevaFecha.isBefore(primerDiaMesActual)) {
                throw new IllegalArgumentException("La fecha efectiva no puede configurarse para un mes pasado.");
            }
            
            config.setFechaEfectiva(nuevaFecha);
        }
        return configuracionRepository.save(config);
    }
}