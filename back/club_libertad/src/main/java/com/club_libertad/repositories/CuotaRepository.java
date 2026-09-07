package com.club_libertad.repositories;

import com.club_libertad.models.Cuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface CuotaRepository extends JpaRepository<Cuota, Long> {
    @Query("SELECT c FROM Cuota c WHERE c.personaId.id = :personaId AND c.deporteId.id = :deporteId AND c.periodo = :periodo")
    Optional<Cuota> findByPersonaDeporteAndPeriodo(@Param("personaId") Long personaId, @Param("deporteId") Long deporteId, @Param("periodo") LocalDate periodo);
    
    void deleteByPersonaId_Id(Long personaId);
}
