package com.club_libertad.repositories;

import com.club_libertad.models.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {
    void deleteBySocioId_Id(Long socioId);

    List<Pago> findByFechaPago(LocalDate fechaPago);

    List<Pago> findByFechaPagoBetween(LocalDate fechaDesde, LocalDate fechaHasta);

    List<Pago> findByFechaPagoGreaterThanEqual(LocalDate fechaDesde);

    List<Pago> findByFechaPagoLessThanEqual(LocalDate fechaHasta);
}