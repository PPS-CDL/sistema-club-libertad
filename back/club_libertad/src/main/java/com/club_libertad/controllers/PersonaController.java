package com.club_libertad.controllers;

import com.club_libertad.dtos.PersonaDTO;
import com.club_libertad.exceptions.RegistroDuplicadoException;
import com.club_libertad.models.Registro;
import com.club_libertad.services.PersonaService;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Persona;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController(value = "personaController")
public class PersonaController {

    private final PersonaService personaService;
    public PersonaController(PersonaService personaService) {
        this.personaService = personaService;
    }

    @GetMapping("/personas")
    @Operation(summary = "Obtiene todas las personas")
    public ResponseEntity<List<Persona>> getPersonas() {
        List<Persona> personas = personaService.getAllPersonas();
        return ResponseEntity.ok(personas);
    }

    @GetMapping("/persona/{id}")
    @Operation(summary = "Obtiene una persona por su id")
    public ResponseEntity<Persona> getPersonaById(@PathVariable Long id) {
        Optional<Persona> persona = personaService.getPersonaById(id);
        ResponseEntity<Persona> response = ResponseEntity.notFound().build();
        if(persona.isPresent()) response = ResponseEntity.ok(persona.get());
        return response;
    }

    @PostMapping("/persona")
    @Operation(summary = "Crea una persona (Socio o Jugador)", description = "Roles - 0 = SOCIO - 1 = JUGADOR - 2 = SOCIOYJUGADOR")
    public ResponseEntity<?> createPersona(@Valid @RequestBody PersonaDTO personaTransfer) {
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear la persona");
        try{
            Optional<Long> id = personaService.savePersona(personaTransfer);
            if(id.isPresent()) response = ResponseEntity.ok("Persona con id " + id.get() + " creada con exito");
        }
        catch (RegistroDuplicadoException e) {
            RegistroDuplicadoResponse body = new RegistroDuplicadoResponse(
                    e.getMessage(),
                    e.getRegistro()
            );
            return ResponseEntity.status(409).body(body);
        } catch (Exception e){
            String message = e.getMessage();
            if (message != null && !message.isBlank()) {
                return ResponseEntity.status(400).body(message);
            }
        }
        return response;
    }

    public static class RegistroDuplicadoResponse {
        public String message;
        public Registro registro;

        public RegistroDuplicadoResponse(String message, Registro registro) {
            this.message = message;
            this.registro = registro;
        }
    }

    @PatchMapping("/persona/activo/{id}")
    @Operation(summary = "Da de baja/alta a una persona por su id")
    public ResponseEntity<String> cambiarEstadoPersona(@PathVariable Long id, @RequestParam(required = false) String observacionBaja) {
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = personaService.cambiarEstadoPersona(id, observacionBaja);
        if(b) response = ResponseEntity.ok("Persona con id " + id + " dada de baja/alta con exito");
        return response;
    }

    @PatchMapping("/persona/{id}")
    @Operation(summary = "Actualiza uno o varios campos de una persona por su id")
    public ResponseEntity<String> updatePersona(@PathVariable Long id, @Valid @RequestBody PersonaDTO persona) {
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = personaService.updatePersonaParcial(id, persona);
        if(b) response = ResponseEntity.ok("Persona con id " + id + " actualizada con exito");
        return response;
    }

    @PostMapping("/persona/{personaId}/deporte/{deporteId}")
    @Operation(summary = "Asocia un deporte a una persona")
    public ResponseEntity<String> asociarDeporte(@PathVariable Long personaId, @PathVariable Long deporteId) {
        boolean b = personaService.asociarDeporte(personaId, deporteId);
        if(b) return ResponseEntity.ok("Deporte asociado correctamente");
        return ResponseEntity.badRequest().body("Error al asociar deporte");
    }

    @DeleteMapping("/persona/{personaId}/deporte/{deporteId}")
    @Operation(summary = "Desasocia un deporte de una persona")
    public ResponseEntity<String> desasociarDeporte(@PathVariable Long personaId, @PathVariable Long deporteId) {
        boolean b = personaService.desasociarDeporte(personaId, deporteId);
        if(b) return ResponseEntity.ok("Deporte desasociado correctamente");
        return ResponseEntity.badRequest().body("Error al desasociar deporte");
    }

    @GetMapping("/persona/{personaId}/deportes")
    @Operation(summary = "Obtiene todos los deportes de una persona")
    public ResponseEntity<Set<Deporte>> getDeportesByPersona(@PathVariable Long personaId) {
        Set<Deporte> deportes = personaService.getDeportesByPersonaId(personaId);
        if(deportes != null) return ResponseEntity.ok(deportes);
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/persona/{id}")
    @Operation(summary = "Elimina una persona por su id")
    public ResponseEntity<String> deletePersona(@PathVariable Long id, @RequestParam(required = false) String observacionBaja) {
        boolean b = personaService.deletePersonaById(id, observacionBaja);
        if(b) return ResponseEntity.ok("Persona con id " + id + " eliminada con exito");
        return ResponseEntity.notFound().build();
    }

}
