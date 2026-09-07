package com.club_libertad.services;

import com.club_libertad.dtos.DeporteDTO;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.DeporteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class DeporteService {
    private final DeporteRepository deporteRepository;
    
    public DeporteService(DeporteRepository deporteRepository) {
        this.deporteRepository = deporteRepository;
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
        BigDecimal cuotaSocial = deporteTransfer.getCuotaSocial() != null ? deporteTransfer.getCuotaSocial() : BigDecimal.ZERO;

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
        Optional<Deporte> deporte = getDeporteById(id);
        if(deporte.isPresent()){
            if(deporteUpdate.getNombre() != null) deporte.get().setNombre(deporteUpdate.getNombre());
            if(deporteUpdate.getDescripcion() != null) deporte.get().setDescripcion(deporteUpdate.getDescripcion());
            if(deporteUpdate.getCuotaEntrenador() != null) deporte.get().setCuotaEntrenador(deporteUpdate.getCuotaEntrenador());
            if(deporteUpdate.getCuotaSeguro() != null) deporte.get().setCuotaSeguro(deporteUpdate.getCuotaSeguro());
            if(deporteUpdate.getCuotaSocial() != null) deporte.get().setCuotaSocial(deporteUpdate.getCuotaSocial());

            BigDecimal cuotaEntrenador = deporte.get().getCuotaEntrenador() != null ? deporte.get().getCuotaEntrenador() : BigDecimal.ZERO;
            BigDecimal cuotaSeguro = deporte.get().getCuotaSeguro() != null ? deporte.get().getCuotaSeguro() : BigDecimal.ZERO;
            BigDecimal cuotaSocial = deporte.get().getCuotaSocial() != null ? deporte.get().getCuotaSocial() : BigDecimal.ZERO;
            deporte.get().setCuotaMensual(cuotaEntrenador.add(cuotaSeguro).add(cuotaSocial));
            b = true;
        }
        return b;
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
