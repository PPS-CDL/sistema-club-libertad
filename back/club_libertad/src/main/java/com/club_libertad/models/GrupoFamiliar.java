package com.club_libertad.models;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;


@Entity
@Table(name = "grupos_familiares")
public class GrupoFamiliar {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    @OneToOne
    @JoinColumn(name = "responsable_id")
    @JsonIgnoreProperties({"grupoFamiliar", "socioResponsable"})
    private Persona responsable;

    @OneToMany(mappedBy = "grupoFamiliar", fetch = FetchType.EAGER)
    @JsonIgnoreProperties({"grupoFamiliar", "socioResponsable"})
    private List<Persona> integrantes = new ArrayList<>();

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public Persona getResponsable() { return responsable; }
    public void setResponsable(Persona responsable) { this.responsable = responsable; }
    public List<Persona> getIntegrantes() { return integrantes; }
    public void setIntegrantes(List<Persona> integrantes) { this.integrantes = integrantes; }
}