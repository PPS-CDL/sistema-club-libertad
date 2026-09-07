package com.club_libertad.exceptions;

import com.club_libertad.models.Registro;

public class RegistroDuplicadoException extends RuntimeException {
    private final Registro registro;

    public RegistroDuplicadoException(Registro registro) {
        super("Esta persona ya se encuentra en el registro (DNI: " + registro.getDni() + ")");
        this.registro = registro;
    }

    public Registro getRegistro() {
        return registro;
    }
}
