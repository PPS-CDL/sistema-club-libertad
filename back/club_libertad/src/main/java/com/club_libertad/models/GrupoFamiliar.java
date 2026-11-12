package com.club_libertad.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "grupos_familiares")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@EqualsAndHashCode
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GrupoFamiliar {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_ultimo_cambio_estado")
    private LocalDate fechaUltimoCambioEstado;

    public Boolean getActivo() {
        return activo == null ? true : activo;
    }

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Persona responsable;

    @OneToMany(mappedBy = "grupoFamiliar", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Persona> integrantes = new ArrayList<>();

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "grupoFamiliar", "socioResponsable", "deportes", "promocion"})
    public Persona getResponsable() {
        return responsable;
    }

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "grupoFamiliar", "socioResponsable", "deportes", "promocion"})
    public List<Persona> getIntegrantes() {
        return integrantes;
    }
}
