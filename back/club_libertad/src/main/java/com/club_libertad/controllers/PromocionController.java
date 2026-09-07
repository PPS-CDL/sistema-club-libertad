package com.club_libertad.controllers;

import com.club_libertad.dtos.PromocionDTO;
import com.club_libertad.models.Promocion;
import com.club_libertad.services.PromocionService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController(value = "/promocionController")
public class PromocionController {
    private final PromocionService promocionService;

    public PromocionController(PromocionService promocionService) {
        this.promocionService = promocionService;
    }

    @GetMapping("/promociones")
    @Operation(summary = "Obtiene todas las promociones")
    public ResponseEntity<List<Promocion>> getPromociones() {
        ResponseEntity<List<Promocion>> response = ResponseEntity.noContent().build();
        List<Promocion> promociones = promocionService.getAllPromociones();
        if (!promociones.isEmpty()) response = ResponseEntity.ok(promociones);
        return response;
    }

    @GetMapping("/promocion/{id}")
    @Operation(summary = "Obtiene una promoción por su id")
    public ResponseEntity<Promocion> getPromocionById(@PathVariable Long id) {
        ResponseEntity<Promocion> response = ResponseEntity.notFound().build();
        Optional<Promocion> promocion = promocionService.getPromocionById(id);
        if (promocion.isPresent()) response = ResponseEntity.ok(promocion.get());
        return response;
    }

    @PostMapping("/promocion")
    @Operation(summary = "Crea una promoción")
    public ResponseEntity<String> createPromocion(@RequestBody PromocionDTO promocionTransfer) {
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear la promoción");
        try {
            Optional<Long> id = promocionService.savePromocion(promocionTransfer);
            if (id.isPresent()) response = ResponseEntity.ok("Promoción con id " + id.get() + " creada con éxito");
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
        return response;
    }

    @PatchMapping("/promocion/{id}")
    @Operation(summary = "Actualiza uno o varios campos de una promoción por su id")
    public ResponseEntity<String> updatePromocion(@PathVariable Long id, @RequestBody Promocion promocion) {
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = promocionService.updatePromocion(id, promocion);
        if (b) response = ResponseEntity.ok("Promoción con id " + id + " actualizada con éxito");
        return response;
    }

    @DeleteMapping("/promocion/{id}")
    @Operation(summary = "Elimina una promoción por su id")
    public ResponseEntity<String> deletePromocion(@PathVariable Long id) {
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = promocionService.deletePromocionById(id);
        if (b) response = ResponseEntity.ok("Promoción con id " + id + " eliminada con éxito");
        return response;
    }
}
