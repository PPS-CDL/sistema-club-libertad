package com.club_libertad.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "deporte")
@Data
@EqualsAndHashCode(exclude = {"personas"})
@NoArgsConstructor
public class Deporte {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length = 100, unique = true, nullable = false)
    private String nombre;
    @Column(columnDefinition = "TEXT")
    private String descripcion;
    @Column(name = "cuota_mensual", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaMensual = BigDecimal.ZERO;
    @Column(name = "cuota_entrenador", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaEntrenador = BigDecimal.ZERO;
    @Column(name = "cuota_seguro", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaSeguro = BigDecimal.ZERO;
    @Column(name = "cuota_social", nullable = false, precision = 10, scale = 2)
    private BigDecimal cuotaSocial = BigDecimal.ZERO;
    @JsonIgnore
    @ManyToMany(mappedBy = "deportes")
    private Set<Persona> personas = new HashSet<>();

    @JsonProperty("personasIds")
    public List<Long> getPersonasIds() {
        return personas != null ? personas.stream()
                .map(Persona::getId)
                .collect(Collectors.toList()) : null;
    }

    @JsonProperty("numeroSocios")
    public int getNumeroSocios() {
        return personas != null ? personas.size() : 0;
    }

    

}
