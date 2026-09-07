package com.club_libertad.controllers;

import com.club_libertad.dtos.CuotaDTO;
import com.club_libertad.enums.EstadoCuota;
import com.club_libertad.models.Cuota;
import com.club_libertad.services.CuotaService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping
public class CuotaController {
    private final CuotaService cuotaService;
    public CuotaController(CuotaService cuotaService) {
        this.cuotaService = cuotaService;
    }

    @GetMapping("/cuotas")
    @Operation(summary = "Obtiene todas las cuotas")
    public ResponseEntity<List<Cuota>> getAllCuotas(){
        ResponseEntity<List<Cuota>> response = ResponseEntity.noContent().build();
        List<Cuota> cuotas = cuotaService.getAllCuotas();
        if(!cuotas.isEmpty()) response = ResponseEntity.ok(cuotas);
        return response;
    }

    @GetMapping("/cuota/{id}")
    @Operation(summary = "Obtiene una cuota por su id")
    public ResponseEntity<Cuota> getCuotaById(@PathVariable Long id){
        ResponseEntity<Cuota> response = ResponseEntity.notFound().build();
        Optional<Cuota> cuota = cuotaService.getCuotaById(id);
        if(cuota.isPresent()) response = ResponseEntity.ok(cuota.get());
        return response;
    }

    @PostMapping("/cuota")
    @Operation(summary = "Crea una cuota")
    public ResponseEntity<String> createCuota(@RequestBody CuotaDTO cuotaTransfer){
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear la cuota");
        try{
            Optional<Long> id = cuotaService.saveCuota(cuotaTransfer);
            if(id.isPresent()) response = ResponseEntity.ok("Cuota con id " + id.get() + " creada con exito");
        } catch (Exception e){
            System.out.println(e.getMessage());
        }
        return response;
    }

    @PatchMapping("/cuota/{id}")
    @Operation(summary = "Actualiza el estado de una cuota por su id", description = "ESTADOS - 0 = GENERADA - 1 = VENCIDA - 2 = PAGADA")
    public ResponseEntity<String> cambiarEstadoCuota(@PathVariable Long id, @RequestBody EstadoCuota estado){
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = cuotaService.changeStateCuota(id, estado);
        if(b) response = ResponseEntity.ok("Estado de la cuota con id " + id + " actualizado con exito");
        return response;
    }

    @PostMapping("/cuotas/generar-mes-actual")
    @Operation(summary = "Genera automáticamente las cuotas del mes actual para todas las inscripciones activas")
    public ResponseEntity<String> generarCuotasMesActual(){
        try{
            int cuotasGeneradas = cuotaService.generarCuotasMesActual();
            return ResponseEntity.ok("Se generaron " + cuotasGeneradas + " cuotas nuevas para el mes actual");
        } catch (Exception e){
            System.out.println(e.getMessage());
            return ResponseEntity.status(500).body("Error al generar cuotas: " + e.getMessage());
        }
    }

    @PostMapping("/cuotas/actualizar-vencidas")
    @Operation(summary = "Actualiza todas las cuotas generadas cuya fecha de vencimiento es menor o igual a hoy a estado VENCIDA")
    public ResponseEntity<String> actualizarCuotasVencidas(){
        try{
            int cuotasVencidas = cuotaService.actualizarCuotasVencidas();
            return ResponseEntity.ok("Se actualizaron " + cuotasVencidas + " cuotas a estado vencido");
        } catch (Exception e){
            System.out.println(e.getMessage());
            return ResponseEntity.status(500).body("Error al actualizar cuotas vencidas: " + e.getMessage());
        }
    }

}
