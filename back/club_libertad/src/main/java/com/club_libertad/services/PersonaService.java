package com.club_libertad.services;

import com.club_libertad.dtos.PersonaDTO;
import com.club_libertad.exceptions.RegistroDuplicadoException;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.DeporteRepository;
import com.club_libertad.repositories.PersonaRepository;
import com.club_libertad.repositories.RegistroRepository;
import com.club_libertad.repositories.InscripcionRepository;
import com.club_libertad.repositories.CuotaRepository;
import com.club_libertad.repositories.PagoRepository;
import com.club_libertad.repositories.PromocionRepository;
import com.club_libertad.models.Registro;
import com.club_libertad.models.Promocion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PersonaService {
    private final PersonaRepository personaRepository;
    private final DeporteRepository deporteRepository;
    private final RegistroRepository registroRepository;
    private final InscripcionRepository inscripcionRepository;
    private final CuotaRepository cuotaRepository;
    private final PagoRepository pagoRepository;
    private final PromocionRepository promocionRepository;

    public PersonaService(PersonaRepository personaRepository, DeporteRepository deporteRepository, RegistroRepository registroRepository, InscripcionRepository inscripcionRepository, CuotaRepository cuotaRepository, PagoRepository pagoRepository, PromocionRepository promocionRepository) {
        this.personaRepository = personaRepository;
        this.deporteRepository = deporteRepository;
        this.registroRepository = registroRepository;
        this.inscripcionRepository = inscripcionRepository;
        this.cuotaRepository = cuotaRepository;
        this.pagoRepository = pagoRepository;
        this.promocionRepository = promocionRepository;
    }

    @Transactional(readOnly = true)
    public List<Persona> getAllPersonas(){
        return personaRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Persona> getPersonaById(Long id){
        return personaRepository.findById(id);
    }

    @Transactional
    public Optional<Long> savePersona(PersonaDTO personaTransfer){
        Optional<Registro> registroExistente = registroRepository.findByDni(personaTransfer.getDni());
        boolean usarRegistroExistente = Boolean.TRUE.equals(personaTransfer.getUsarRegistroExistente());
        if (registroExistente.isPresent() && !usarRegistroExistente) {
            throw new RegistroDuplicadoException(registroExistente.get());
        }
        Persona personaCreate = new Persona();
        if (registroExistente.isPresent() && usarRegistroExistente) {
            personaCreate.setNombre(registroExistente.get().getNombre());
            personaCreate.setApellido(registroExistente.get().getApellido());
            personaCreate.setDni(registroExistente.get().getDni());
        } else {
            personaCreate.setNombre(personaTransfer.getNombre());
            personaCreate.setApellido(personaTransfer.getApellido());
            personaCreate.setDni(personaTransfer.getDni());
        }
        personaCreate.setFechaNacimiento(personaTransfer.getFechaNacimiento());
        personaCreate.setEmail(personaTransfer.getEmail());
        personaCreate.setTelefono(personaTransfer.getTelefono());
        personaCreate.setDireccion(personaTransfer.getDireccion());
        personaCreate.setCategoria(personaTransfer.getCategoria());
        // Me aseguro que se cree un registro de fecha de registro
        ZonedDateTime fechaRegistro = ZonedDateTime.now();
        personaCreate.setFechaRegistro(fechaRegistro);
        // Me aseguro de que 'activo' tenga un valor por defecto
        personaCreate.setActivo(true);
        if(personaTransfer.getSocioResponsableId() != null){
            Persona socioResponsable = new Persona();
            socioResponsable.setId(personaTransfer.getSocioResponsableId());
            personaCreate.setSocioResponsable(socioResponsable);
        } else if (personaTransfer.getSocioResponsableDni() != null && !personaTransfer.getSocioResponsableDni().trim().isEmpty()) {
            Optional<Persona> socioResponsable = personaRepository.findByDni(personaTransfer.getSocioResponsableDni().trim());
            if (socioResponsable.isPresent()) {
                personaCreate.setSocioResponsable(socioResponsable.get());
            } else {
                return Optional.empty();
            }
        }
        
        // Asignar promociones si vienen en el DTO
        if(personaTransfer.getPromocionId() != null) {
            Optional<Promocion> promoOpt = promocionRepository.findById(personaTransfer.getPromocionId());
            if(promoOpt.isPresent()) {
                personaCreate.setPromocion(promoOpt.get());
            }
        }

        // Crear registro inmutable asociado a la creación de la persona
        Registro registro = new Registro();
        registro.setNombre(personaCreate.getNombre());
        registro.setApellido(personaCreate.getApellido());
        registro.setDni(personaCreate.getDni());
        registro.setFechaRegistro(fechaRegistro);
        if (registroExistente.isEmpty()) {
            registroRepository.save(registro);
        }

        Persona p = personaRepository.save(personaCreate);

        return Optional.of(p.getId());
    }

    @Transactional
    public boolean cambiarEstadoPersona(Long id, String observacionBaja){
        boolean b = false;
        Optional<Persona> persona = personaRepository.findById(id);
        if(persona.isPresent()){
            persona.get().setActivo(!persona.get().getActivo());
            String dni = persona.get().getDni();
            Optional<Registro> registro = registroRepository.findByDni(dni);
            if(registro.isPresent()){
                if(registro.get().getFechaBaja() == null){
                    registro.get().setFechaBaja(ZonedDateTime.now());
                    if(observacionBaja != null && !observacionBaja.trim().isEmpty()){
                    registro.get().setObservacionBaja(observacionBaja);
                    }
                }
                else{
                    registro.get().setFechaBaja(null);
                    registro.get().setObservacionBaja(null);
                }
                b = true;
            }
        }
        return b;
    }

    @Transactional
    public boolean updatePersonaParcial(Long id, PersonaDTO personaUpdate){
        boolean b = false;
        Optional<Persona> persona = getPersonaById(id);
        if(persona.isPresent()){
            if(personaUpdate.getNombre() != null) persona.get().setNombre(personaUpdate.getNombre());
            if(personaUpdate.getApellido() != null) persona.get().setApellido(personaUpdate.getApellido());
            if(personaUpdate.getFechaNacimiento() != null) persona.get().setFechaNacimiento(personaUpdate.getFechaNacimiento());
            if(personaUpdate.getEmail() != null) persona.get().setEmail(personaUpdate.getEmail());
            if(personaUpdate.getTelefono() != null) persona.get().setTelefono(personaUpdate.getTelefono());
            if(personaUpdate.getDireccion() != null) persona.get().setDireccion(personaUpdate.getDireccion());
            if(personaUpdate.getCategoria() != null) persona.get().setCategoria(personaUpdate.getCategoria());
            if(personaUpdate.getSocioResponsableId() != null){
                Persona p = new Persona();
                p.setId(personaUpdate.getSocioResponsableId());
                persona.get().setSocioResponsable(p);
            } 
            if(personaUpdate.getPromocionId() != null){
                Promocion p = new Promocion();
                p.setId(personaUpdate.getPromocionId());
                persona.get().setPromocion(p);
            }
            b = true;
        }
        return b;
    }

    @Transactional
    public boolean asociarDeporte(Long personaId, Long deporteId){
        Optional<Persona> persona = personaRepository.findById(personaId);
        Optional<Deporte> deporte = deporteRepository.findById(deporteId);
        if(persona.isPresent() && deporte.isPresent()){
            persona.get().getDeportes().add(deporte.get());
            personaRepository.save(persona.get());
            return true;
        }
        return false;
    }

    @Transactional
    public boolean desasociarDeporte(Long personaId, Long deporteId){
        Optional<Persona> persona = personaRepository.findById(personaId);
        Optional<Deporte> deporte = deporteRepository.findById(deporteId);
        if(persona.isPresent() && deporte.isPresent()){
            persona.get().getDeportes().remove(deporte.get());
            personaRepository.save(persona.get());
            return true;
        }
        return false;
    }

    @Transactional(readOnly = true)
    public Set<Deporte> getDeportesByPersonaId(Long personaId){
        Optional<Persona> persona = personaRepository.findById(personaId);
        return persona.map(Persona::getDeportes).orElse(null);
    }

    @Transactional
    public boolean deletePersonaById(Long id, String observacionBaja){
        if(personaRepository.existsById(id)){
            Optional<Persona> persona = personaRepository.findById(id);
            if(persona.isPresent()){
                // Actualizar el registro con la fecha de baja y observación
                String dni = persona.get().getDni();
                Optional<Registro> registro = registroRepository.findByDni(dni);
                if(registro.isPresent()) {
                    registro.get().setFechaBaja(ZonedDateTime.now());
                    if(observacionBaja != null && !observacionBaja.trim().isEmpty()) {
                        registro.get().setObservacionBaja(observacionBaja);
                    }
                    registroRepository.save(registro.get());
                }
                
                // Eliminar todas las cuotas asociadas a esta persona
                cuotaRepository.deleteByPersonaId_Id(id);
                
                // Eliminar todas las inscripciones de esta persona
                inscripcionRepository.deleteByPersonaId_Id(id);

                // Eliminar todos los pagos asociados a esta persona
                pagoRepository.deleteBySocioId_Id(id);
                
                // Desasociar promociones y deportes (relaciones many-to-many)
                persona.get().setPromocion(null);
                persona.get().getDeportes().clear();
                personaRepository.save(persona.get());
                
                // Eliminar referencias como socioResponsable de otras personas
                List<Persona> personasDependientes = personaRepository.findAll().stream()
                    .filter(p -> p.getSocioResponsable() != null && p.getSocioResponsable().getId().equals(id))
                    .toList();
                for(Persona p : personasDependientes){
                    p.setSocioResponsable(null);
                }
                
                // 5. Finalmente, eliminar la persona
                personaRepository.deleteById(id);
                return true;
            }
        }
        return false;
    }
}
