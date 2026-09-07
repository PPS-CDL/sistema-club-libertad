package com.club_libertad.models;

import com.club_libertad.enums.TipoDescuento;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "promocion")
@Data
@EqualsAndHashCode(exclude = {"personas"})
@NoArgsConstructor
public class Promocion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(length = 100, unique = true, nullable = false)
    private String nombre;
    
    @Column(columnDefinition = "TEXT")
    private String descripcion;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoDescuento tipoDescuento;
    
    @Column(name = "descuento", nullable = false, precision = 10, scale = 2)
    private BigDecimal descuento;
    
    @Column(nullable = false)
    private Boolean activo = true;
    
    @JsonIgnore
    @OneToMany(mappedBy = "promocion")
    private Set<Persona> personas;

    @JsonProperty("personasIds")
    public List<Long> getPersonasIds() {
        return personas != null ? personas.stream()
                .map(Persona::getId)
                .collect(Collectors.toList()) : null;
    }
}
