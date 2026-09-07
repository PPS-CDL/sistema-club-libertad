package com.club_libertad.controllers;

import com.club_libertad.dtos.LoginDTO;
import com.club_libertad.dtos.UsuarioDTO;
import com.club_libertad.dtos.ChangePasswordDTO;
import com.club_libertad.models.Usuario;
import com.club_libertad.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController(value = "usuarioController")
public class UsuarioController {
    private final UsuarioService usuarioService;
    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/usuarios")
    @Operation(summary = "Obtiene todos los usuarios")
    public ResponseEntity<List<Usuario>> getUsuarios(){
        ResponseEntity<List<Usuario>> response = ResponseEntity.noContent().build();
        List<Usuario> usuarios = usuarioService.getAllUsuarios();
        if(!usuarios.isEmpty()) {
            response = ResponseEntity.ok(usuarios);
        }
        return response;
    }

    @PostMapping("/usuario")
    @Operation(summary = "Crea un usuario", description = "Roles - 0 = ADMIN - 1 = SECRETARIO")
    public ResponseEntity<?> createUsuario(@RequestBody UsuarioDTO usuarioTransfer){
        ResponseEntity<String> response = ResponseEntity
                .status(400)
                .body("Error al crear el usuario");
        try{
            Optional<UsuarioService.UsuarioCreado> created = usuarioService.saveUsuario(usuarioTransfer);
            if(created.isPresent()) return ResponseEntity.ok(created.get());
        } catch (DataIntegrityViolationException e) {
            String detail = String.valueOf(e.getMostSpecificCause().getMessage()).toLowerCase();
            if (detail.contains("username")) {
                return ResponseEntity.status(409).body("El nombre de usuario ya existe");
            }
            if (detail.contains("email")) {
                return ResponseEntity.status(409).body("El correo ya existe");
            }
            return ResponseEntity.status(409).body("El usuario o correo ya existe");
        } catch (Exception e){
            System.out.println(e.getMessage());
        }
        return response;
    }

    @PostMapping("/usuario/validate")
    @Operation(summary = "Valida un usuario")
    public ResponseEntity<String> validateUsuario(@RequestBody LoginDTO login){
        ResponseEntity<String> response = ResponseEntity.ok("Usuario o contraseña incorrectos");
        Optional<Usuario> u = usuarioService.validateUsuario(login);
        if(u.isPresent()){
            response = ResponseEntity.ok("Usuario con id " + u.get().getId() +" validado con exito");
        }
        return response;
    }

    @PatchMapping("/usuario/estado/{id}")
    @Operation(summary = "Da de baja/alta a un usuario por su id")
    public ResponseEntity<String> cambiarEstadoUsuario(@PathVariable Long id){
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = usuarioService.estadoUsuario(id);
        if(b) response = ResponseEntity.ok("Usuario con id " + id +" dado de baja/alta con exito");
        return response;
    }

    @PatchMapping("/usuario/{id}")
    @Operation(summary = "Actualiza uno o varios campos de un usuario por id")
    public ResponseEntity<String> updateUsuario(@PathVariable Long id, @RequestBody UsuarioDTO usuarioUpdate){
        ResponseEntity<String> response = ResponseEntity.badRequest().build();
        boolean b = usuarioService.updateUsuarioParcial(id, usuarioUpdate);
        if(b){
            response = ResponseEntity.ok("Usuario actualizado con exito");
        }
        return response;
    }

    @PostMapping("/usuario/{id}/password")
    @Operation(summary = "Actualiza la contraseña de un usuario")
    public ResponseEntity<String> changePassword(@PathVariable Long id, @RequestBody ChangePasswordDTO body){
        try {
            boolean ok = usuarioService.changePassword(id, body.getCurrentPassword(), body.getNewPassword());
            if (ok) return ResponseEntity.ok("Contraseña actualizada con exito");
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @DeleteMapping("/usuario/{id}")
    @Operation(summary = "Elimina un usuario por su id")
    public ResponseEntity<String> deleteUsuario(@PathVariable Long id){
        boolean b = usuarioService.deleteUsuarioById(id);
        if(b) return ResponseEntity.ok("Usuario con id " + id + " eliminado con exito");
        return ResponseEntity.notFound().build();
    }


}
