package com.club_libertad.models;

import jakarta.persistence.*;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "event", nullable = false)
    private String event; // LOGIN_SUCCESS, LOGIN_FAILURE

    @Column(name = "timestamp", nullable = false)
    private java.time.ZonedDateTime timestamp;

    public AuditLog() {}
    public AuditLog(String username, String event, java.time.ZonedDateTime timestamp) {
        this.username = username;
        this.event = event;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEvent() { return event; }
    public java.time.ZonedDateTime getTimestamp() { return timestamp; }
    public void setId(Long id) { this.id = id; }
    public void setUsername(String username) { this.username = username; }
    public void setEvent(String event) { this.event = event; }
    public void setTimestamp(java.time.ZonedDateTime timestamp) { this.timestamp = timestamp; }
}
