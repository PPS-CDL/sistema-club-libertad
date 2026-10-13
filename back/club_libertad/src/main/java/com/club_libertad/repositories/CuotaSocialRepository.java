package com.club_libertad.repositories;
import com.club_libertad.models.CuotaSocial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuotaSocialRepository extends JpaRepository<CuotaSocial, Long> {
    // Busca cuotas activas (no canceladas) de un socio en un periodo
    @Query("SELECT c FROM CuotaSocial c WHERE c.socio.id = :socioId AND c.periodo = :periodo AND c.estado IN ('PENDIENTE', 'PAGADA', 'VENCIDA')")
    Optional<CuotaSocial> findActivaBySocioAndPeriodo(@Param("socioId") Long socioId, @Param("periodo") String periodo);

    // Busca cuotas activas (no canceladas) de un grupo familiar en un periodo
    @Query("SELECT c FROM CuotaSocial c WHERE c.grupoFamiliar.id = :grupoId AND c.periodo = :periodo AND c.estado IN ('PENDIENTE', 'PAGADA', 'VENCIDA')")
    Optional<CuotaSocial> findActivaByGrupoAndPeriodo(@Param("grupoId") Long grupoId, @Param("periodo") String periodo);
    
    List<CuotaSocial> findBySocioId(Long socioId);
}