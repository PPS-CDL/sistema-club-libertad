package com.club_libertad.controllers;
import com.club_libertad.models.CuotaSocial;
import com.club_libertad.services.CuotaSocialService;

import io.swagger.v3.oas.annotations.Operation;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/cuotas-sociales")
@CrossOrigin(origins = "*")
public class CuotaSocialController {

    private final CuotaSocialService cuotaSocialService;

    public CuotaSocialController(CuotaSocialService cuotaSocialService) {
        this.cuotaSocialService = cuotaSocialService;
    }

    @GetMapping
    @Operation(summary = "Obtiene todas las cuotas sociales")
    public ResponseEntity<List<CuotaSocial>> getAll() {
        return ResponseEntity.ok(cuotaSocialService.getAllCuotasSociales());
    }
}