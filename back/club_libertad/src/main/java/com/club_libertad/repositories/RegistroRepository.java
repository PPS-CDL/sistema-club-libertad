package com.club_libertad.repositories;

import com.club_libertad.models.Registro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RegistroRepository extends JpaRepository<Registro, Long> {
    Optional<Registro> findByDni(String dni);
}