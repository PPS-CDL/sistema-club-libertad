package com.club_libertad.services;

import com.club_libertad.dtos.LoginDTO;
import com.club_libertad.dtos.UsuarioDTO;
import com.club_libertad.models.Usuario;
import com.club_libertad.repositories.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.security.SecureRandom;

@Service
public class UsuarioService {
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private static final String PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int PASSWORD_LENGTH = 10;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public record UsuarioCreado(Long id, String username, String email, String role, String passwordTemporal) {}

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<Usuario> getAllUsuarios(){
        return usuarioRepository.findAll();
    }

    @Transactional
    public Optional<UsuarioCreado> saveUsuario(UsuarioDTO usuarioTransfer){
        Usuario usuarioCreate = new Usuario();
        usuarioCreate.setUsername(usuarioTransfer.getUsername());
        String rawPassword = usuarioTransfer.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = generarPasswordAleatoria();
        }
        usuarioCreate.setPassword(passwordEncoder.encode(rawPassword));
        usuarioCreate.setEmail(usuarioTransfer.getEmail());
        usuarioCreate.setRole(usuarioTransfer.getRole());
        usuarioCreate.setActivo(true);
        Usuario usuarioCreated = usuarioRepository.save(usuarioCreate);
        return Optional.of(new UsuarioCreado(
                usuarioCreated.getId(),
                usuarioCreated.getUsername(),
                usuarioCreated.getEmail(),
                usuarioCreated.getRole().name(),
                rawPassword
        ));
    }

    private String generarPasswordAleatoria() {
        StringBuilder sb = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            int index = SECURE_RANDOM.nextInt(PASSWORD_CHARS.length());
            sb.append(PASSWORD_CHARS.charAt(index));
        }
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public Optional<Usuario> getUsuarioByUsername(String username){
        return usuarioRepository.findByUsername(username);
    }


    
    @Transactional(readOnly = true)
    public Optional<Usuario> validateUsuario(LoginDTO login) {
        Optional<Usuario> usuarioOpt = getUsuarioByUsername(login.getUsername());

        if (usuarioOpt.isEmpty()) {
            return Optional.empty();
        }

        Usuario usuario = usuarioOpt.get();

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            return Optional.empty();
        }

        if (!passwordEncoder.matches(login.getPassword(), usuario.getPassword())) {
            return Optional.empty();
        }

        return Optional.of(usuario);
    }

    @Transactional
    public boolean estadoUsuario(Long id){
        boolean b = false;
        Usuario u = usuarioRepository.findById(id).orElse(null);
        if(u != null){
            u.setActivo(!Boolean.TRUE.equals(u.getActivo()));
            b = true;
        }
        return b;
    }

    @Transactional
    public boolean updateUsuarioParcial(Long id, UsuarioDTO usuarioUpdate){
        boolean b = false;
        Optional<Usuario> usuario = usuarioRepository.findById(id);
        if(usuario.isPresent()){
            if(usuarioUpdate.getUsername() != null) usuario.get().setUsername(usuarioUpdate.getUsername());
            if(usuarioUpdate.getPassword() != null) usuario.get().setPassword(passwordEncoder.encode(usuarioUpdate.getPassword()));
            if(usuarioUpdate.getEmail() != null) usuario.get().setEmail(usuarioUpdate.getEmail());
            if(usuarioUpdate.getRole() != null) usuario.get().setRole(usuarioUpdate.getRole());
            b = true;
        }
        return b;
    }

    @Transactional
    public boolean changePassword(Long id, String currentPassword, String newPassword) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return false;
        }
        Usuario usuario = usuarioOpt.get();
        if (currentPassword == null || newPassword == null) {
            throw new IllegalArgumentException("Datos de contraseña incompletos");
        }
        if (!passwordEncoder.matches(currentPassword, usuario.getPassword())) {
            throw new IllegalArgumentException("La contraseña actual no es correcta");
        }
        usuario.setPassword(passwordEncoder.encode(newPassword));
        return true;
    }

    @Transactional
    public boolean deleteUsuarioById(Long id){
        if(usuarioRepository.existsById(id)){
            usuarioRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
