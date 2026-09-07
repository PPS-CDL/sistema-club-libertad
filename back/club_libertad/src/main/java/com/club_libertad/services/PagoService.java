package com.club_libertad.services;

import com.club_libertad.dtos.PagoDTO;
import com.club_libertad.enums.EstadoCuota;
import com.club_libertad.models.Cuota;
import com.club_libertad.models.Pago;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.CuotaRepository;
import com.club_libertad.repositories.PagoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class PagoService {
    private final PagoRepository pagoRepository;
    private final CuotaRepository cuotaRepository;
    
    public PagoService(PagoRepository pagoRepository, CuotaRepository cuotaRepository) {
        this.pagoRepository = pagoRepository;
        this.cuotaRepository = cuotaRepository;
    }

    @Transactional(readOnly = true)
    public List<Pago> getAllPagos(){ return pagoRepository.findAll(); }

    @Transactional(readOnly = true)
    public Optional<Pago> getPagoById(Long id){ return pagoRepository.findById(id); }

    @Transactional
    public Optional<Long> savePago(PagoDTO pagoTransfer){
        Pago pagoCreate = new Pago();
        Persona socioExisting = new Persona();
        socioExisting.setId(pagoTransfer.getSocioId());
        pagoCreate.setSocioId(socioExisting);
        pagoCreate.setFechaPago(pagoTransfer.getFechaPago());
        if(pagoTransfer.getMetodoPago() != null) pagoCreate.setMetodoPago(pagoTransfer.getMetodoPago());
        if(pagoTransfer.getObservaciones() != null) pagoCreate.setObservaciones(pagoTransfer.getObservaciones());
        
        // Calculate fee components from cuotas (without discount) and total with discounts
        BigDecimal totalEntrenador = BigDecimal.ZERO;
        BigDecimal totalSeguro = BigDecimal.ZERO;
        BigDecimal totalSocial = BigDecimal.ZERO;
        BigDecimal montoTotalConDescuento = BigDecimal.ZERO;
        
        if(pagoTransfer.getCuotaIds() != null && !pagoTransfer.getCuotaIds().isEmpty()) {
            for(Long cuotaId : pagoTransfer.getCuotaIds()) {
                Optional<Cuota> cuotaOpt = cuotaRepository.findById(cuotaId);
                if(cuotaOpt.isPresent()) {
                    Cuota cuota = cuotaOpt.get();
                    totalEntrenador = totalEntrenador.add(cuota.getCuotaEntrenador() != null ? cuota.getCuotaEntrenador() : BigDecimal.ZERO);
                    totalSeguro = totalSeguro.add(cuota.getCuotaSeguro() != null ? cuota.getCuotaSeguro() : BigDecimal.ZERO);
                    totalSocial = totalSocial.add(cuota.getCuotaSocial() != null ? cuota.getCuotaSocial() : BigDecimal.ZERO);
                    montoTotalConDescuento = montoTotalConDescuento.add(cuota.getMonto() != null ? cuota.getMonto() : BigDecimal.ZERO);
                }
            }
        }
        
        pagoCreate.setCuotaEntrenador(totalEntrenador);
        pagoCreate.setCuotaSeguro(totalSeguro);
        pagoCreate.setCuotaSocial(totalSocial);
        pagoCreate.setMontoTotal(montoTotalConDescuento);
        
        // Save pago first to get its ID
        Pago pagoCreated = pagoRepository.save(pagoCreate);
        
        // Associate cuotas with this pago
        if(pagoTransfer.getCuotaIds() != null && !pagoTransfer.getCuotaIds().isEmpty()) {
            for(Long cuotaId : pagoTransfer.getCuotaIds()) {
                Optional<Cuota> cuotaOpt = cuotaRepository.findById(cuotaId);
                if(cuotaOpt.isPresent()) {
                    Cuota cuota = cuotaOpt.get();
                    cuota.setPagoId(pagoCreated);
                    cuota.setEstado(EstadoCuota.PAGADA);
                    cuotaRepository.save(cuota);
                }
            }
        }
        
        return Optional.of(pagoCreated.getId());
    }
}
