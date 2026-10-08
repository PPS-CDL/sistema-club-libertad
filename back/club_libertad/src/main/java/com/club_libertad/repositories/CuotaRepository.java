package com.club_libertad.repositories;

import com.club_libertad.dtos.IngresosPorDeporteDTO;
import com.club_libertad.models.Cuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.List;

@Repository
public interface CuotaRepository extends JpaRepository<Cuota, Long> {
    @Query("SELECT c FROM Cuota c WHERE c.personaId.id = :personaId AND c.deporteId.id = :deporteId AND c.periodo = :periodo")
    Optional<Cuota> findByPersonaDeporteAndPeriodo(@Param("personaId") Long personaId,
            @Param("deporteId") Long deporteId, @Param("periodo") LocalDate periodo);

    void deleteByPersonaId_Id(Long personaId);

<<<<<<< Updated upstream
    List<Cuota> findByPersonaId_Id(Long personaId);
}
=======
    @Query("SELECT new com.club_libertad.dtos.IngresosPorDeporteDTO(" +
            "d.id, d.nombre, COUNT(c.id), " +
            "COALESCE(SUM(c.cuotaSocial), 0), " +
            "COALESCE(SUM(c.cuotaEntrenador), 0), " +
            "COALESCE(SUM(c.cuotaSeguro), 0), " +
            "COALESCE(SUM(c.monto), 0)) " +
            "FROM Cuota c JOIN c.deporteId d JOIN c.pagoId p " +
            "WHERE c.estado = com.club_libertad.enums.EstadoCuota.PAGADA " +
            "AND (:fecha IS NULL OR p.fechaPago = :fecha) " +
            "AND (:fechaDesde IS NULL OR p.fechaPago >= :fechaDesde) " +
            "AND (:fechaHasta IS NULL OR p.fechaPago <= :fechaHasta) " +
            "AND (:deporteId IS NULL OR d.id = :deporteId) " +
            "GROUP BY d.id, d.nombre")
    List<IngresosPorDeporteDTO> findIngresosPorDeporte(
            @Param("fecha") LocalDate fecha,
            @Param("fechaDesde") LocalDate fechaDesde,
            @Param("fechaHasta") LocalDate fechaHasta,
            @Param("deporteId") Long deporteId);

    @Query("SELECT c FROM Cuota c JOIN c.pagoId p " +
            "WHERE c.estado = com.club_libertad.enums.EstadoCuota.PAGADA " +
            "AND (:fecha IS NULL OR p.fechaPago = :fecha) " +
            "AND (:fechaDesde IS NULL OR p.fechaPago >= :fechaDesde) " +
            "AND (:fechaHasta IS NULL OR p.fechaPago <= :fechaHasta) " +
            "AND (:deporteId IS NULL OR c.deporteId.id = :deporteId)")
    List<Cuota> findCuotasCobradasPorFechaYDeporte(
            @Param("fecha") LocalDate fecha,
            @Param("fechaDesde") LocalDate fechaDesde,
            @Param("fechaHasta") LocalDate fechaHasta,
            @Param("deporteId") Long deporteId);
}
>>>>>>> Stashed changes
