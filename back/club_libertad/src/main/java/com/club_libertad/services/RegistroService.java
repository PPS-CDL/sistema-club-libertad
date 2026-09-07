package com.club_libertad.services;

import com.club_libertad.models.Registro;
import com.club_libertad.repositories.RegistroRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistroService {

    private final RegistroRepository registroRepository;

    public RegistroService(RegistroRepository registroRepository) {
        this.registroRepository = registroRepository;
    }

    @Transactional(readOnly = true)
    public List<Registro> getAllRegistros() {
        return registroRepository.findAll();
    }
}