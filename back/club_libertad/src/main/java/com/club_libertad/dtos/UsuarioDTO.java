package com.club_libertad.dtos;

import com.club_libertad.enums.RoleUsuario;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UsuarioDTO {
    public String username;
    public String password;
    public String email;
    @Enumerated(EnumType.STRING)
    public RoleUsuario role;
}
