package com.club_libertad.repositories;

import com.club_libertad.models.Inscripcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InscripcionRepository extends JpaRepository<Inscripcion, Long> {
    @Query("SELECT i FROM Inscripcion i WHERE i.fechaBaja IS NULL")
    List<Inscripcion> findAllActive();
    
    void deleteByPersonaId_Id(Long personaId);

    Optional<Inscripcion> findByPersonaId_IdAndDeporteId_IdAndFechaBajaIsNull(Long personaId, Long deporteId);
    Optional<Inscripcion> findByPersonaId_IdAndDeporteId_Id(Long personaId, Long deporteId);
}
