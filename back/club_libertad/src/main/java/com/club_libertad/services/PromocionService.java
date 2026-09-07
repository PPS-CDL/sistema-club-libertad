package com.club_libertad.services;

import com.club_libertad.dtos.PromocionDTO;
import com.club_libertad.models.Promocion;
import com.club_libertad.repositories.PromocionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PromocionService {
    private final PromocionRepository promocionRepository;

    public PromocionService(PromocionRepository promocionRepository) {
        this.promocionRepository = promocionRepository;
    }

    @Transactional(readOnly = true)
    public List<Promocion> getAllPromociones() {
        return promocionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Promocion> getPromocionById(Long id) {
        return promocionRepository.findById(id);
    }

    @Transactional
    public Optional<Long> savePromocion(PromocionDTO promocionTransfer) {
        Promocion promocionCreate = new Promocion();
        promocionCreate.setNombre(promocionTransfer.getNombre());
        promocionCreate.setDescripcion(promocionTransfer.getDescripcion());
        promocionCreate.setTipoDescuento(promocionTransfer.getTipoDescuento());
        promocionCreate.setDescuento(promocionTransfer.getDescuento());
        promocionCreate.setActivo(promocionTransfer.getActivo() != null ? promocionTransfer.getActivo() : true);
        Promocion promocionCreated = promocionRepository.save(promocionCreate);
        return Optional.of(promocionCreated.getId());
    }

    @Transactional
    public boolean updatePromocion(Long id, Promocion promocionUpdate) {
        boolean b = false;
        Optional<Promocion> promocion = getPromocionById(id);
        if (promocion.isPresent()) {
            if (promocionUpdate.getNombre() != null) promocion.get().setNombre(promocionUpdate.getNombre());
            if (promocionUpdate.getDescripcion() != null) promocion.get().setDescripcion(promocionUpdate.getDescripcion());
            if (promocionUpdate.getTipoDescuento() != null) promocion.get().setTipoDescuento(promocionUpdate.getTipoDescuento());
            if (promocionUpdate.getDescuento() != null) promocion.get().setDescuento(promocionUpdate.getDescuento());
            if (promocionUpdate.getActivo() != null) promocion.get().setActivo(promocionUpdate.getActivo());
            b = true;
        }
        return b;
    }

    @Transactional
    public boolean deletePromocionById(Long id) {
        try {
            if (promocionRepository.existsById(id)) {
                promocionRepository.deleteById(id);
                return true;
            }
            return false;
        } catch (Exception e) {
            System.out.println("Error al eliminar promoción: " + e.getMessage());
            return false;
        }
    }
}
