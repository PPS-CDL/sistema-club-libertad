package com.club_libertad.dtos;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PersonaEstadoPagoDTO {
    private Long personaId; // Key
    private String nombre;
    private String apellido;
    private String dni;
    private String estado;  // "PAGADA" o "PENDIENTE"
}