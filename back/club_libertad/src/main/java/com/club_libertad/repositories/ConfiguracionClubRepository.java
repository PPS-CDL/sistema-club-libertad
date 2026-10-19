package com.club_libertad.repositories;
import com.club_libertad.models.ConfiguracionClub;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConfiguracionClubRepository extends JpaRepository<ConfiguracionClub, Long> {
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT c FROM ConfiguracionClub c ORDER BY c.id")
	List<ConfiguracionClub> findAllForUpdate();
}