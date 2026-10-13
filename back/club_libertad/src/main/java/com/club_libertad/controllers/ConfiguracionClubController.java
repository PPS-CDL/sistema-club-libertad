package com.club_libertad.controllers;
import com.club_libertad.dtos.ConfiguracionClubDTO;
import com.club_libertad.models.ConfiguracionClub;
import com.club_libertad.services.ConfiguracionClubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/configuracion")
public class ConfiguracionClubController {

    private final ConfiguracionClubService configuracionService;

    public ConfiguracionClubController(ConfiguracionClubService configuracionService) {
        this.configuracionService = configuracionService;
    }

    @GetMapping
    public ResponseEntity<ConfiguracionClub> getConfiguracion() {
        return ResponseEntity.ok(configuracionService.getConfiguracion());
    }

    @PutMapping
    public ResponseEntity<?> updateConfiguracion(@RequestBody ConfiguracionClubDTO dto) {
        try {
            ConfiguracionClub configActualizada = configuracionService.updateConfiguracion(dto);
            return ResponseEntity.ok(configActualizada);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error interno al actualizar la configuración.");
        }
    }
}