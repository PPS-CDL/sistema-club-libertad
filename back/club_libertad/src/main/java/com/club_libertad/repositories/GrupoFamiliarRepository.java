package com.club_libertad.repositories;

import com.club_libertad.models.GrupoFamiliar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GrupoFamiliarRepository extends JpaRepository<GrupoFamiliar, Long> {
}