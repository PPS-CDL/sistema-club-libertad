package com.club_libertad.controllers;
import com.club_libertad.dtos.GrupoFamiliarDTO;
import com.club_libertad.models.GrupoFamiliar;
import com.club_libertad.services.GrupoFamiliarService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/grupos")
public class GrupoFamiliarController {
    private final GrupoFamiliarService grupoFamiliarService;

    public GrupoFamiliarController(GrupoFamiliarService grupoFamiliarService) {
        this.grupoFamiliarService = grupoFamiliarService;
    }

    @GetMapping
     @Operation(summary = "Obtiene todos los grupos familiares")
    public ResponseEntity<List<GrupoFamiliar>> getAll() {
        return ResponseEntity.ok(grupoFamiliarService.getAllGrupos());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtiene un grupo familiar por su ID")
    public ResponseEntity<GrupoFamiliar> getById(@PathVariable Long id) {
        return grupoFamiliarService.getGrupoById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Crea un nuevo grupo familiar")
    public ResponseEntity<?> create(@RequestBody GrupoFamiliarDTO dto) {
        try {
            GrupoFamiliar grupo = grupoFamiliarService.saveGrupo(dto);
            return ResponseEntity.ok(grupo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualiza un grupo familiar por su ID")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody GrupoFamiliarDTO dto) {
        try {
            GrupoFamiliar grupo = grupoFamiliarService.updateGrupo(id, dto);
            return ResponseEntity.ok(grupo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Elimina un grupo familiar por su ID")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            grupoFamiliarService.deleteGrupo(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}