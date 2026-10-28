package com.club_libertad.repositories;

import com.club_libertad.dtos.PersonaAsambleaDTO;
import com.club_libertad.models.Persona;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonaRepository extends JpaRepository<Persona, Long> {
    Optional<Persona> findByDni(String dni);

    @Query("""
        SELECT new com.club_libertad.dtos.PersonaAsambleaDTO(
            p.id,
            p.apellido,
            p.nombre,
            p.dni,
            p.categoria,
            p.fechaNacimiento,
            COALESCE(
                SUM(CASE
                    WHEN cs.estado = 'PENDIENTE'
                      OR cs.estado = 'VENCIDA'
                    THEN 1L
                    ELSE 0L
                END),
                0L
            )
        )
        FROM Persona p
        LEFT JOIN CuotaSocial cs ON (
            (cs.tipoCuota = 'INDIVIDUAL' AND cs.socio = p)
            OR
            (cs.tipoCuota = 'FAMILIAR' AND p.grupoFamiliar IS NOT NULL AND cs.grupoFamiliar = p.grupoFamiliar)
        )
        WHERE p.activo = true
          AND p.categoria IN (
              com.club_libertad.enums.CategoriaPersona.SOCIO,
              com.club_libertad.enums.CategoriaPersona.SOCIOYJUGADOR
          )
          AND p.fechaNacimiento IS NOT NULL
          AND p.fechaNacimiento <= :fechaMinima
        GROUP BY p.id, p.apellido, p.nombre, p.dni, p.categoria, p.fechaNacimiento
        HAVING COALESCE(
            SUM(CASE
                WHEN cs.estado = 'PENDIENTE'
                  OR cs.estado = 'VENCIDA'
                THEN 1L
                ELSE 0L
            END),
            0L
        ) <= 3
        """)
    List<PersonaAsambleaDTO> findPersonasParaAsamblea(@Param("fechaMinima") LocalDate fechaMinima);
}