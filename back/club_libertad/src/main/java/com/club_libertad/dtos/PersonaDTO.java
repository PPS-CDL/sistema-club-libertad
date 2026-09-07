package com.club_libertad.dtos;

import com.club_libertad.enums.CategoriaPersona;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
public class PersonaDTO {
    public String nombre;
    public String apellido;
    @Pattern(
        regexp = "^[0-9]{7,8}$",
        message = "El DNI debe tener entre 7 y 8 números, sin puntos ni espacios"
    )
    public String dni;
    public LocalDate fechaNacimiento;
    @Pattern(
        regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        message = "El formato del email no es válido"
    )
    public String email;
    @Pattern(
        regexp = "^\\+?[0-9]{10,15}$",
        message = "El teléfono debe contener entre 10 y 15 números (puede incluir + al inicio)"
    )
    public String telefono;
    public String direccion;
    @Enumerated(EnumType.STRING)
    public CategoriaPersona categoria;
    public Long socioResponsableId;
    public String socioResponsableDni;
    public Boolean usarRegistroExistente;
    public Long promocionId;
}
