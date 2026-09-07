package com.club_libertad.controllers;

import com.club_libertad.dtos.DeporteDTO;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Persona;
import com.club_libertad.services.DeporteService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController(value = "/deporteController")
public class DeporteController {
    private final DeporteService deporteService;
    public DeporteController(DeporteService deporteService) {
        this.deporteService = deporteService;
    }

    @GetMapping("/deportes")
    @Operation(summary = "Obtiene todos los deportes")
    public ResponseEntity<List<Deporte>> getDeportes(){
        List<Deporte> deportes = deporteService.getAllDeportes();
        return ResponseEntity.ok(deportes);
    }

    @GetMapping("/deporte/{id}")
    @Operation(summary = "Obtiene un deporte por su id")
    public ResponseEntity<Deporte> getDeporteById(@PathVariable Long id){
        ResponseEntity<Deporte> response = ResponseEntity.notFound().build();
        Optional<Deporte> deporte = deporteService.getDeporteById(id);
        if(deporte.isPresent()) response = ResponseEntity.ok(deporte.get());
        return response;
    }

    @PostMapping("/deporte")
    @Operation(summary = "Crea un deporte")
    public ResponseEntity<String> createDeporte(@RequestBody DeporteDTO deporteTransfer){
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear el deporte");
        try{
            Optional<Long> id = deporteService.saveDeporte(deporteTransfer);
            if(id.isPresent()) response = ResponseEntity.ok("Deporte con id " + id.get() + " creada con exito");
        }
        catch (Exception e){
            System.out.println(e.getMessage());
        }
        return response;
    }

    @PatchMapping("/deporte/{id}")
    @Operation(summary = "Actualiza uno o varios campos de un deporte por su id")
    public ResponseEntity<String> updateDeporte(@PathVariable Long id, @RequestBody Deporte deporte){
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = deporteService.updateDeporte(id, deporte);
        if(b) response = ResponseEntity.ok("Deporte con id " + id + " actualizada con exito");
        return response;
    }

    @DeleteMapping("/deporte/{id}")
    @Operation(summary = "Elimina un deporte por su id")
    public ResponseEntity<String> deleteDeporte(@PathVariable Long id){
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = deporteService.deleteDeporteById(id);
        if(b) response = ResponseEntity.ok("Deporte con id " + id + " eliminada con exito");
        return response;
    }

    @GetMapping("/deporte/{deporteId}/personas")
    @Operation(summary = "Obtiene todas las personas inscritas en un deporte")
    public ResponseEntity<Set<Persona>> getPersonasByDeporte(@PathVariable Long deporteId) {
        Set<Persona> personas = deporteService.getPersonasByDeporteId(deporteId);
        if(personas != null) return ResponseEntity.ok(personas);
        return ResponseEntity.notFound().build();
    }

}
