package com.club_libertad.dtos;

import com.club_libertad.enums.RoleUsuario;

public class AuthDTOs {
    public static class LoginRequest {
        private String username;
        private String password;
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        public void setUsername(String username) { this.username = username; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginResponse {
        private String token;
        private long expiresInMillis;
        private Long id;
        private String username;
        private RoleUsuario role;
        public LoginResponse(String token, long expiresInMillis, Long id, String username, RoleUsuario role) {
            this.token = token; this.expiresInMillis = expiresInMillis; this.id = id; this.username = username; this.role = role;
        }
        public String getToken() { return token; }
        public long getExpiresInMillis() { return expiresInMillis; }
        public Long getId() { return id; }
        public String getUsername() { return username; }
        public RoleUsuario getRole() { return role; }
    }
}
