package com.club_libertad.services;

import com.club_libertad.dtos.PersonaAsambleaDTO;
import com.club_libertad.dtos.PersonaDTO;
import com.club_libertad.enums.EstadoCuota;
import com.club_libertad.exceptions.RegistroDuplicadoException;
import com.club_libertad.models.Cuota;
import com.club_libertad.models.CuotaSocial;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.GrupoFamiliar;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.*;
import com.club_libertad.models.Registro;
import com.club_libertad.models.Promocion;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PersonaService {
    private static final String MENSAJE_ERROR_BORRADO = "No se permite el borrado de socios con cuotas pagas, solo se pueden borrar socios recién registrados por error";

    private final PersonaRepository personaRepository;
    private final DeporteRepository deporteRepository;
    private final RegistroRepository registroRepository;
    private final InscripcionRepository inscripcionRepository;
    private final CuotaRepository cuotaRepository;
    private final PagoRepository pagoRepository;
    private final PromocionRepository promocionRepository;
    private final CuotaService cuotaService;
    private final GrupoFamiliarRepository grupoFamiliarRepository;
    private final CuotaSocialRepository cuotaSocialRepository;
    private final CuotaSocialService cuotaSocialService;

    public PersonaService(PersonaRepository personaRepository, DeporteRepository deporteRepository, RegistroRepository registroRepository, InscripcionRepository inscripcionRepository, CuotaRepository cuotaRepository, PagoRepository pagoRepository, PromocionRepository promocionRepository, CuotaService cuotaService, GrupoFamiliarRepository grupoFamiliarRepository, CuotaSocialRepository cuotaSocialRepository, CuotaSocialService cuotaSocialService) {
        this.personaRepository = personaRepository;
        this.deporteRepository = deporteRepository;
        this.registroRepository = registroRepository;
        this.inscripcionRepository = inscripcionRepository;
        this.cuotaRepository = cuotaRepository;
        this.pagoRepository = pagoRepository;
        this.promocionRepository = promocionRepository;
        this.cuotaService = cuotaService;
        this.grupoFamiliarRepository = grupoFamiliarRepository;
        this.cuotaSocialRepository = cuotaSocialRepository;
        this.cuotaSocialService = cuotaSocialService;
    }

    @Transactional(readOnly = true)
    public List<Persona> getAllPersonas(){
        return personaRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<PersonaAsambleaDTO> getPersonasParaAsamblea() {
        LocalDate fechaMinima = LocalDate.now().minusYears(18);
        return personaRepository.findPersonasParaAsamblea(fechaMinima);
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

        // Si se asignó promoción al crear, evaluar recálculo de cuota actual impaga
        if (p.getPromocion() != null) {
            cuotaService.actualizarCuotasMesActualParaPersona(p);
        }
        cuotaSocialService.sincronizarCuotasSocialesMesActual();
        
        return Optional.of(p.getId());
    }

    @Transactional
    public boolean cambiarEstadoPersona(Long id, String observacionBaja){
        boolean b = false;
        Optional<Persona> personaOpt = personaRepository.findById(id);
        if(personaOpt.isPresent()){
           Persona persona = personaOpt.get();
            boolean nuevoEstado = !persona.getActivo();
            persona.setActivo(nuevoEstado);

            if (!nuevoEstado && (persona.getGrupoFamiliar() == null
                    || !cuotaSocialRepository.existsByGrupoFamiliar_Id(persona.getGrupoFamiliar().getId()))) {
                revisarYDisolverGrupoFamiliar(persona);
            }
            String dni = persona.getDni();
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
            cuotaSocialService.sincronizarCuotasSocialesMesActual();
        }
        return b;
    }

    @Transactional
    public boolean updatePersonaParcial(Long id, PersonaDTO personaUpdate){
        Optional<Persona> personaOpt = getPersonaById(id);
        if(personaOpt.isPresent()){
            Persona persona = personaOpt.get();
            if(personaUpdate.getNombre() != null) persona.setNombre(personaUpdate.getNombre());
            if(personaUpdate.getApellido() != null) persona.setApellido(personaUpdate.getApellido());
            if(personaUpdate.getFechaNacimiento() != null) persona.setFechaNacimiento(personaUpdate.getFechaNacimiento());
            if(personaUpdate.getEmail() != null) persona.setEmail(personaUpdate.getEmail());
            if(personaUpdate.getTelefono() != null) persona.setTelefono(personaUpdate.getTelefono());
            if(personaUpdate.getDireccion() != null) persona.setDireccion(personaUpdate.getDireccion());
            if(personaUpdate.getCategoria() != null) persona.setCategoria(personaUpdate.getCategoria());
            if(personaUpdate.getSocioResponsableId() != null){
                Persona p = new Persona();
                p.setId(personaUpdate.getSocioResponsableId());
                persona.setSocioResponsable(p);
            } 
            
            // Actualizar o remover promoción
            if(personaUpdate.getPromocionId() != null){
                Optional<Promocion> promoOpt = promocionRepository.findById(personaUpdate.getPromocionId());
                promoOpt.ifPresent(persona::setPromocion);
            } else {
                // Si se envía explícitamente sin promoción o se decide limpiar
                persona.setPromocion(null);
            }
            
            personaRepository.save(persona);

            // Disparar la actualización de la cuota del mes actual (aplica descuento o revierte si se quitó)
            cuotaService.actualizarCuotasMesActualParaPersona(persona);
            cuotaSocialService.sincronizarCuotasSocialesMesActual();

            return true;
        }
        return false;
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
        Optional<Persona> personaOpt = personaRepository.findById(id);
        if (personaOpt.isPresent()) {
            Persona persona = personaOpt.get();

            // Validar que sea exclusivamente un socio recién registrado por error
            validarElegibilidadBorradoPorError(persona);

            revisarYDisolverGrupoFamiliar(persona);

            // Eliminar registro inmutable para liberar el DNI en altas erróneas
            String dni = persona.getDni();
            Optional<Registro> registro = registroRepository.findByDni(dni);
            registro.ifPresent(registroRepository::delete);
            
            // Eliminar cuotas deportivas asociadas
            cuotaRepository.deleteByPersonaId_Id(id);
            
            // Eliminar cuotas sociales asociadas
            List<CuotaSocial> cuotasSociales = cuotaSocialRepository.findBySocioId(id);
            if (cuotasSociales != null && !cuotasSociales.isEmpty()) {
                cuotaSocialRepository.deleteAll(cuotasSociales);
            }
            
            // Eliminar todas las inscripciones de esta persona
            inscripcionRepository.deleteByPersonaId_Id(id);

            // Desasociar promociones y deportes (relaciones many-to-many)
            persona.setPromocion(null);
            persona.getDeportes().clear();
            personaRepository.save(persona);
            
            // Eliminar referencias como socioResponsable de otras personas
            List<Persona> personasDependientes = personaRepository.findAll().stream()
                .filter(p -> p.getSocioResponsable() != null && p.getSocioResponsable().getId().equals(id))
                .toList();
            for(Persona p : personasDependientes){
                p.setSocioResponsable(null);
            }
            
            // Finalmente, eliminar la persona
            personaRepository.deleteById(id);
            return true;
        }
        return false;
    }

    private void validarElegibilidadBorradoPorError(Persona persona) {
        Long personaId = persona.getId();

        // 1. Validar que no existan pagos registrados
        if (pagoRepository.existsBySocioId_Id(personaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, MENSAJE_ERROR_BORRADO);
        }

        // 2. Validar cuotas deportivas: máximo 1 y estrictamente en estado GENERADA
        List<Cuota> cuotasDeportivas = cuotaRepository.findByPersonaId_Id(personaId);
        if (cuotasDeportivas != null && !cuotasDeportivas.isEmpty()) {
            if (cuotasDeportivas.size() > 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, MENSAJE_ERROR_BORRADO);
            }
            Cuota cuotaDeportiva = cuotasDeportivas.get(0);
            if (cuotaDeportiva.getEstado() != EstadoCuota.GENERADA) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, MENSAJE_ERROR_BORRADO);
            }
        }

        // 3. Validar cuotas sociales: máximo 1 y estrictamente en estado PENDIENTE
        List<CuotaSocial> cuotasSociales = cuotaSocialRepository.findBySocioId(personaId);
        if (cuotasSociales != null && !cuotasSociales.isEmpty()) {
            if (cuotasSociales.size() > 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, MENSAJE_ERROR_BORRADO);
            }
            CuotaSocial cuotaSocial = cuotasSociales.get(0);
            if (cuotaSocial.getEstado() == null || !cuotaSocial.getEstado().trim().equalsIgnoreCase("PENDIENTE")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, MENSAJE_ERROR_BORRADO);
            }
        }
    }

    // Método para revisar si la persona inactiva es responsable de un grupo familiar y disolverlo si es necesario.
    private void revisarYDisolverGrupoFamiliar(Persona personaInactiva) {
        GrupoFamiliar grupo = personaInactiva.getGrupoFamiliar();
        if (grupo == null) {
            return;
        }
        boolean esResponsable = grupo.getResponsable() != null && grupo.getResponsable().getId().equals(personaInactiva.getId());
        
        // Calcular total de integrantes reales
        int totalIntegrantes = grupo.getIntegrantes().size();
        boolean responsableIncluidoEnLista = grupo.getIntegrantes().stream()
                .anyMatch(p -> grupo.getResponsable() != null && p.getId().equals(grupo.getResponsable().getId()));
        
        if (grupo.getResponsable() != null && !responsableIncluidoEnLista) {
            totalIntegrantes++;
        }
        // Si es el responsable o el grupo quedará con menos de 3 personas -> DISOLVER EL GRUPO
        if (esResponsable || totalIntegrantes <= 3) {
            if (grupo.getResponsable() != null) {
                grupo.getResponsable().setGrupoFamiliar(null);
                personaRepository.save(grupo.getResponsable());
            }
            // Evitar ConcurrentModificationException utilizando una copia de la lista
            List<Persona> integrantesCopia = new ArrayList<>(grupo.getIntegrantes());
            for (Persona p : integrantesCopia) {
                p.setGrupoFamiliar(null);
                personaRepository.save(p);
            }
            grupoFamiliarRepository.delete(grupo);
        } else {
            // Si el grupo sobrevive, solo se quita la persona inactiva
            personaInactiva.setGrupoFamiliar(null);
            personaRepository.save(personaInactiva);
        }
    }
}