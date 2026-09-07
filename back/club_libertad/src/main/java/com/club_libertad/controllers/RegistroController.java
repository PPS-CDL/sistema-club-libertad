package com.club_libertad.controllers;

import com.club_libertad.models.Registro;
import com.club_libertad.services.RegistroService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController(value = "registroController")
public class RegistroController {

    private final RegistroService registroService;

    public RegistroController(RegistroService registroService) {
        this.registroService = registroService;
    }

    @GetMapping("/registros")
    @Operation(summary = "Obtiene todos los registros")
    public ResponseEntity<List<Registro>> getRegistros() {
        List<Registro> registros = registroService.getAllRegistros();
        ResponseEntity<List<Registro>> response = ResponseEntity.noContent().build();
        if (!registros.isEmpty()) {
            response = ResponseEntity.ok(registros);
        }
        return response;
    }
}