package com.club_libertad.repositories;

import com.club_libertad.models.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import com.club_libertad.dtos.IngresoPorSocioDTO;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {
    
    void deleteBySocioId_Id(Long socioId);

    @Query("""
        SELECT new com.club_libertad.dtos.IngresoPorSocioDTO(
            p.id,
            p.nombre,
            p.apellido,
            p.dni,
            SUM(pg.montoTotal),
            COUNT(pg.id),
            MAX(pg.fechaPago)
        )
        FROM Pago pg
        JOIN pg.socioId p
        GROUP BY p.id, p.nombre, p.apellido, p.dni
        ORDER BY SUM(pg.montoTotal) DESC
        """)
    List<IngresoPorSocioDTO> findIngresosPorSocio();

}
