package com.club_libertad.repositories;
import com.club_libertad.models.ConfiguracionClub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionClubRepository extends JpaRepository<ConfiguracionClub, Long> {
}