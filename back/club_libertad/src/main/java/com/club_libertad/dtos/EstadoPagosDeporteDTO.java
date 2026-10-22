package com.club_libertad.dtos;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EstadoPagosDeporteDTO {
    private String periodo;
    private int totalInscriptos;
    private int pagaron;
    private int deben;
    private List<PersonaEstadoPagoDTO> personas;
}