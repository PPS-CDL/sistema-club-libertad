package com.club_libertad.services;

import com.club_libertad.dtos.DeporteDTO;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.DeporteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class DeporteService {
    private final DeporteRepository deporteRepository;
    private final ConfiguracionClubService configuracionClubService;
    
    public DeporteService(DeporteRepository deporteRepository, ConfiguracionClubService configuracionClubService) {
        this.deporteRepository = deporteRepository;
        this.configuracionClubService = configuracionClubService;
    }

    @Transactional(readOnly = true)
    public List<Deporte> getAllDeportes(){
        return deporteRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Deporte> getDeporteById(Long id){
        return deporteRepository.findById(id);
    }

    @Transactional
    public Optional<Long> saveDeporte(DeporteDTO deporteTransfer){
        Deporte deporteCreate = new Deporte();
        deporteCreate.setNombre(deporteTransfer.getNombre());
        deporteCreate.setDescripcion(deporteTransfer.getDescripcion());
        BigDecimal cuotaEntrenador = deporteTransfer.getCuotaEntrenador() != null ? deporteTransfer.getCuotaEntrenador() : BigDecimal.ZERO;
        BigDecimal cuotaSeguro = deporteTransfer.getCuotaSeguro() != null ? deporteTransfer.getCuotaSeguro() : BigDecimal.ZERO;
        BigDecimal cuotaSocial = esPostTransicion()
            ? BigDecimal.ZERO
            : deporteTransfer.getCuotaSocial() != null ? deporteTransfer.getCuotaSocial() : BigDecimal.ZERO;

        deporteCreate.setCuotaEntrenador(cuotaEntrenador);
        deporteCreate.setCuotaSeguro(cuotaSeguro);
        deporteCreate.setCuotaSocial(cuotaSocial);
        deporteCreate.setCuotaMensual(cuotaEntrenador.add(cuotaSeguro).add(cuotaSocial));
        Deporte deporteCreated = deporteRepository.save(deporteCreate);
        return Optional.of(deporteCreated.getId());
    }

    @Transactional
    public boolean updateDeporte(Long id, Deporte deporteUpdate){
        boolean b = false;
        Optional<Deporte> deporteOpt = getDeporteById(id);
        if(deporteOpt.isPresent()){
          Deporte deporte = deporteOpt.get();
            if(deporteUpdate.getNombre() != null) deporte.setNombre(deporteUpdate.getNombre());
            if(deporteUpdate.getDescripcion() != null) deporte.setDescripcion(deporteUpdate.getDescripcion());
            if(deporteUpdate.getCuotaEntrenador() != null) deporte.setCuotaEntrenador(deporteUpdate.getCuotaEntrenador());
            if(deporteUpdate.getCuotaSeguro() != null) deporte.setCuotaSeguro(deporteUpdate.getCuotaSeguro());

            // REGLA: No se actualiza la cuota social del deporte en esta operación. 
            // La cuota social se mantiene para preservar la coherencia histórica de las cuotas ya generadas antes de la transición.
            BigDecimal cuotaEntrenador = deporte.getCuotaEntrenador() != null ? deporte.getCuotaEntrenador() : BigDecimal.ZERO;
            BigDecimal cuotaSeguro = deporte.getCuotaSeguro() != null ? deporte.getCuotaSeguro() : BigDecimal.ZERO;
            BigDecimal cuotaSocialHistorica = deporte.getCuotaSocial() != null ? deporte.getCuotaSocial() : BigDecimal.ZERO;
            
            BigDecimal cuotaSocialVigente = esPostTransicion() ? BigDecimal.ZERO : cuotaSocialHistorica;
            deporte.setCuotaMensual(cuotaEntrenador.add(cuotaSeguro).add(cuotaSocialVigente));
            b = true;
        }
        return b;
    }

    private boolean esPostTransicion() {
        LocalDate fechaEfectiva = configuracionClubService.getConfiguracion().getFechaEfectiva();
        return fechaEfectiva != null && !LocalDate.now().withDayOfMonth(1).isBefore(fechaEfectiva);
    }

    @Transactional
    public boolean deleteDeporteById(Long id){
        try {
            Optional<Deporte> deporte = deporteRepository.findById(id);
            if(deporte.isPresent()) {
                // Remove associations with personas first
                Deporte d = deporte.get();
                for(Persona persona : d.getPersonas()) {
                    persona.getDeportes().remove(d);
                }
                d.getPersonas().clear();
                deporteRepository.flush();
                // Now delete the deporte
                deporteRepository.deleteById(id);
                return true;
            }
            return false;
        } catch (Exception e) {
            System.out.println("Error al eliminar deporte: " + e.getMessage());
            return false;
        }
    }

    @Transactional(readOnly = true)
    public Set<Persona> getPersonasByDeporteId(Long deporteId){
        Optional<Deporte> deporte = deporteRepository.findById(deporteId);
        return deporte.map(Deporte::getPersonas).orElse(null);
    }
}
