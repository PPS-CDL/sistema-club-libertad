package com.club_libertad.controllers;

import com.club_libertad.dtos.InscripcionDTO;
import com.club_libertad.models.Inscripcion;
import com.club_libertad.services.InscripcionService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController(value = "/inscripcionController")
public class InscripcionController {
    private final InscripcionService inscripcionService;
    public InscripcionController(InscripcionService inscripcionService) {
        this.inscripcionService = inscripcionService;
    }

    @GetMapping("/inscripciones")
    @Operation(summary = "Obtiene todas las inscripciones")
    public ResponseEntity<List<Inscripcion>> getInscripciones(){
        ResponseEntity<List<Inscripcion>> response = ResponseEntity.noContent().build();
        List<Inscripcion> inscripciones = inscripcionService.getAllInscripciones();
        if(!inscripciones.isEmpty()) response = ResponseEntity.ok(inscripciones);
        return response;
    }

    @GetMapping("/inscripcion/{id}")
    @Operation(summary = "Obtiene una inscripcion por su id")
    public ResponseEntity<Inscripcion> getInscripcionById(@PathVariable Long id){
        ResponseEntity<Inscripcion> response = ResponseEntity.notFound().build();
        Optional<Inscripcion> inscripcion = inscripcionService.getInscripcionById(id);
        if(inscripcion.isPresent()) response = ResponseEntity.ok(inscripcion.get());
        return response;
    }

    @PostMapping("/inscripcion")
    @Operation(summary = "Crea una inscripcion")
    public ResponseEntity<String> createInscripcion(@RequestBody InscripcionDTO inscripcionTransfer){
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear la inscripcion");
        try{
            Optional<Long> id = inscripcionService.saveInscripcion(inscripcionTransfer);
            if(id.isPresent()) response = ResponseEntity.ok("Inscripcion con id " + id.get() + " creada con exito");
        }
        catch (Exception e){
            System.out.println(e.getMessage());
        }
        return response;
    }

    @PatchMapping("/inscripcion/{idPersona}/{idDeporte}")
    @Operation(summary = "Da de baja una inscripcion por su id")
    public ResponseEntity<String> bajaInscripcion(@PathVariable Long idPersona, @PathVariable Long idDeporte){
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = inscripcionService.darBajaInscripcion(idPersona, idDeporte);
        if(b) response = ResponseEntity.ok("Inscripcion dada de baja con exito");
        return response;
    }


}
