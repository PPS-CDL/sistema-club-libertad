package com.club_libertad.services;

import com.club_libertad.dtos.InscripcionDTO;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Inscripcion;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.InscripcionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class    InscripcionService {
    private final InscripcionRepository inscripcionRepository;
    public InscripcionService(InscripcionRepository inscripcionRepository) {
        this.inscripcionRepository = inscripcionRepository;
    }

    @Transactional(readOnly = true)
    public List<Inscripcion> getAllInscripciones(){
        return inscripcionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Inscripcion> getInscripcionById(Long id){
        return inscripcionRepository.findById(id);
    }

    @Transactional
    public Optional<Long> saveInscripcion(InscripcionDTO inscripcionTransfer){
        Optional<Long> id = Optional.empty();
        Optional<Inscripcion> i = inscripcionRepository
        .findByPersonaId_IdAndDeporteId_Id(
            inscripcionTransfer.getPersonaId(), inscripcionTransfer.getDeporteId()
        );
        if(i.isPresent()){
            i.get().setFechaBaja(null);
            id = Optional.of(i.get().getId());
        }
        else{
            Inscripcion inscripcionCreate = new Inscripcion();
            Persona personaExisting = new Persona();
            personaExisting.setId(inscripcionTransfer.getPersonaId());
            inscripcionCreate.setPersonaId(personaExisting);
            Deporte deporteExisting = new Deporte();
            deporteExisting.setId(inscripcionTransfer.getDeporteId());
            inscripcionCreate.setDeporteId(deporteExisting);
            inscripcionCreate.setFechaInscripcion(inscripcionTransfer.getFechaInscripcion());
            Inscripcion inscripcionCreated = inscripcionRepository.save(inscripcionCreate);
            id = Optional.of(inscripcionCreated.getId());
        }
        
        return id;
    }

    @Transactional
    public boolean darBajaInscripcion(Long idPersona, Long idDeporte){
        boolean b = false;
        Optional<Inscripcion> i = inscripcionRepository.findByPersonaId_IdAndDeporteId_IdAndFechaBajaIsNull(idPersona, idDeporte);
        if(i.isPresent()){
            i.get().setFechaBaja(LocalDate.now());
            b = true;
        }
        return b;
    }
}
