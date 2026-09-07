package com.club_libertad.services;

import com.club_libertad.enums.RoleUsuario;
import com.club_libertad.models.AuditLog;
import com.club_libertad.models.Usuario;
import com.club_libertad.repositories.AuditLogRepository;
import com.club_libertad.repositories.UsuarioRepository;
import com.club_libertad.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Optional;

@Service
public class AuthService {
    private final UsuarioRepository usuarioRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final int maxFailedAttempts;

    public AuthService(UsuarioRepository usuarioRepository,
                       AuditLogRepository auditLogRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       @Value("${app.auth.maxFailedAttempts:5}") int maxFailedAttempts) {
        this.usuarioRepository = usuarioRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.maxFailedAttempts = maxFailedAttempts;
    }

    @Transactional
    public Optional<String> login(String username, String rawPassword) {
        Optional<Usuario> opt = usuarioRepository.findByUsername(username);
        ZonedDateTime now = ZonedDateTime.now();
        if (opt.isEmpty()) {
            auditLogRepository.save(new AuditLog(username, "LOGIN_FAILURE", now));
            return Optional.empty();
        }
        Usuario u = opt.get();
        if (Boolean.FALSE.equals(u.getActivo()) || Boolean.TRUE.equals(u.getBloqueado())) {
            auditLogRepository.save(new AuditLog(username, "LOGIN_FAILURE", now));
            return Optional.empty();
        }
        boolean matches = passwordEncoder.matches(rawPassword, u.getPassword());
        if (!matches) {
            u.setIntentosFallidos(u.getIntentosFallidos() + 1);
            u.setUltimoIntentoFallido(now);
            if (u.getIntentosFallidos() >= maxFailedAttempts) {
                u.setBloqueado(true);
            }
            auditLogRepository.save(new AuditLog(username, "LOGIN_FAILURE", now));
            return Optional.empty();
        }
        // success
        u.setIntentosFallidos(0);
        u.setUltimoAcceso(now);
        String token = jwtUtil.generateToken(u.getUsername(), u.getRole());
        auditLogRepository.save(new AuditLog(username, "LOGIN_SUCCESS", now));
        return Optional.of(token);
    }

    @Transactional
    public Usuario createUser(String username, String rawPassword, RoleUsuario role) {
        return usuarioRepository.findByUsername(username).orElseGet(() -> {
            Usuario u = new Usuario();
            u.setUsername(username);
            u.setPassword(passwordEncoder.encode(rawPassword));
            u.setRole(role);
            u.setActivo(true);
            u.setIntentosFallidos(0);
            u.setBloqueado(false);
            return usuarioRepository.save(u);
        });
    }
}
