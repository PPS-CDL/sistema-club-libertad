package com.club_libertad.controllers;

import com.club_libertad.dtos.PagoDTO;
import com.club_libertad.models.Pago;
import com.club_libertad.services.PagoService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController(value = "pagoController")
public class PagoController {
    private final PagoService pagoService;
    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @GetMapping("/pagos")
    @Operation(summary = "Obtiene todos los pagos")
    public ResponseEntity<List<Pago>> getPagos(){
        ResponseEntity<List<Pago>> response = ResponseEntity.noContent().build();
        List<Pago> pagos = pagoService.getAllPagos();
        if(!pagos.isEmpty()) response = ResponseEntity.ok(pagos);
        return response;
    }

    @GetMapping("/pago/{id}")
    @Operation(summary = "Obtiene un pago por su id")
    public ResponseEntity<Pago> getPagoById(@PathVariable Long id){
        ResponseEntity<Pago> response = ResponseEntity.notFound().build();
        Optional<Pago> pago = pagoService.getPagoById(id);
        if(pago.isPresent()) response = ResponseEntity.ok(pago.get());
        return response;
    }

    @PostMapping("/pago")
    @Operation(summary = "Crea un pago y asocia cuotas", description = "Crea un pago y asocia las cuotas especificadas por sus IDs. Las cuotas asociadas se marcan como PAGADAS. METODOS DE PAGO - 0 = EFECTIVO - 1 = TRANSFERENCIA - 2 = DEBITO_AUTOMATICO")
    public ResponseEntity<String> createPago(@RequestBody PagoDTO pagoTransfer){
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear el pago");
        try{
            Optional<Long> id = pagoService.savePago(pagoTransfer);
            if(id.isPresent()) response = ResponseEntity.ok("Pago con id " + id.get() + " creado con exito");
        } catch (Exception e){
            System.out.println(e.getMessage());
        }
        return response;
    }
}
