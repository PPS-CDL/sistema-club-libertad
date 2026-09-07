package com.club_libertad.repositories;

import com.club_libertad.models.Persona;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonaRepository extends JpaRepository<Persona, Long> {
	java.util.Optional<Persona> findByDni(String dni);
}
