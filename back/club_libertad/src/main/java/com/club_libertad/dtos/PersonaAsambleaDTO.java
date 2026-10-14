package com.club_libertad.dtos;

import com.club_libertad.enums.CategoriaPersona;
import java.time.LocalDate;
import java.time.Period;

public class PersonaAsambleaDTO {
    private Long id;
    private String apellido;
    private String nombre;
    private String dni;
    private CategoriaPersona categoria;
    private LocalDate fechaNacimiento;
    private Integer edad;
    private Long cuotasAdeudadas;

    public PersonaAsambleaDTO(
            Long id,
            String apellido,
            String nombre,
            String dni,
            CategoriaPersona categoria,
            LocalDate fechaNacimiento,
            Long cuotasAdeudadas
    ) {
        this.id = id;
        this.apellido = apellido;
        this.nombre = nombre;
        this.dni = dni;
        this.categoria = categoria;
        this.fechaNacimiento = fechaNacimiento;
        this.cuotasAdeudadas = cuotasAdeudadas;
        this.edad = (fechaNacimiento != null)
                ? Period.between(fechaNacimiento, LocalDate.now()).getYears()
                : null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDni() {
        return dni;
    }

    public void setDni(String dni) {
        this.dni = dni;
    }

    public CategoriaPersona getCategoria() {
        return categoria;
    }

    public void setCategoria(CategoriaPersona categoria) {
        this.categoria = categoria;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public void setFechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
    }

    public Integer getEdad() {
        return edad;
    }

    public void setEdad(Integer edad) {
        this.edad = edad;
    }

    public Long getCuotasAdeudadas() {
        return cuotasAdeudadas;
    }

    public void setCuotasAdeudadas(Long cuotasAdeudadas) {
        this.cuotasAdeudadas = cuotasAdeudadas;
    }
}
