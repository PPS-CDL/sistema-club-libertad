package com.club_libertad.repositories;

import com.club_libertad.models.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {
	void deleteBySocioId_Id(Long socioId);
}
