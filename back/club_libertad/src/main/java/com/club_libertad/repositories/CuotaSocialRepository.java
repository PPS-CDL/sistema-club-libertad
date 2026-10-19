package com.club_libertad.repositories;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import com.club_libertad.models.CuotaSocial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuotaSocialRepository extends JpaRepository<CuotaSocial, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CuotaSocial c WHERE c.id = :id")
    Optional<CuotaSocial> findByIdForUpdate(@Param("id") Long id);

    // Busca cuotas activas (no canceladas) de un socio en un periodo
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CuotaSocial c WHERE c.socio.id = :socioId AND c.periodo = :periodo AND c.estado IN ('PENDIENTE', 'PAGADA', 'VENCIDA')")
    Optional<CuotaSocial> findActivaBySocioAndPeriodo(@Param("socioId") Long socioId, @Param("periodo") String periodo);

    // Busca cuotas activas (no canceladas) de un grupo familiar en un periodo
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CuotaSocial c WHERE c.grupoFamiliar.id = :grupoId AND c.periodo = :periodo AND c.estado IN ('PENDIENTE', 'PAGADA', 'VENCIDA')")
    Optional<CuotaSocial> findActivaByGrupoAndPeriodo(@Param("grupoId") Long grupoId, @Param("periodo") String periodo);
    
    List<CuotaSocial> findBySocioId(Long socioId);
        List<CuotaSocial> findByPeriodo(String periodo);
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT c FROM CuotaSocial c WHERE c.periodo = :periodo")
        List<CuotaSocial> findByPeriodoForUpdate(@Param("periodo") String periodo);
    boolean existsByGrupoFamiliar_Id(Long grupoFamiliarId);

        @Query("""
                SELECT c FROM CuotaSocial c JOIN c.pago p
                WHERE c.estado = 'PAGADA'
                    AND (:fecha IS NULL OR p.fechaPago = :fecha)
                    AND (:fechaDesde IS NULL OR p.fechaPago >= :fechaDesde)
                    AND (:fechaHasta IS NULL OR p.fechaPago <= :fechaHasta)
                """)
        List<CuotaSocial> findCobradasPorFecha(
                        @Param("fecha") java.time.LocalDate fecha,
                        @Param("fechaDesde") java.time.LocalDate fechaDesde,
                        @Param("fechaHasta") java.time.LocalDate fechaHasta);
}