package com.club_libertad.services;

import com.club_libertad.dtos.CuotaDTO;
import com.club_libertad.enums.EstadoCuota;
import com.club_libertad.models.Cuota;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Inscripcion;
import com.club_libertad.models.Persona;
import com.club_libertad.models.Promocion;
import com.club_libertad.repositories.CuotaRepository;
import com.club_libertad.repositories.DeporteRepository;
import com.club_libertad.repositories.InscripcionRepository;
import com.club_libertad.repositories.PersonaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Service
public class CuotaService {
    private final CuotaRepository cuotaRepository;
    private final InscripcionRepository inscripcionRepository;
    private final PersonaRepository personaRepository;
    private final DeporteRepository deporteRepository;
    
    public CuotaService(CuotaRepository cuotaRepository, InscripcionRepository inscripcionRepository, PersonaRepository personaRepository, DeporteRepository deporteRepository) {
        this.cuotaRepository = cuotaRepository;
        this.inscripcionRepository = inscripcionRepository;
        this.personaRepository = personaRepository;
        this.deporteRepository = deporteRepository;
    }

    // Método auxiliar para calcular monto con descuentos de promociones
    private BigDecimal aplicarDescuentoPromocion(BigDecimal montoOriginal, Promocion promocion) {
        if (promocion == null) {
            return montoOriginal;
        }
        
        BigDecimal descuentoTotal = BigDecimal.ZERO;
        if (promocion.getActivo() != null && promocion.getActivo()) {
            if (promocion.getTipoDescuento().name().equals("PORCENTAJE")) {
                BigDecimal descuentoPorcentual = montoOriginal.multiply(promocion.getDescuento()).divide(BigDecimal.valueOf(100));
                descuentoTotal = descuentoTotal.add(descuentoPorcentual);
            } else { // MONTO_FIJO
                descuentoTotal = descuentoTotal.add(promocion.getDescuento());
            }
        }
        
        
        BigDecimal montoFinal = montoOriginal.subtract(descuentoTotal);
        return montoFinal.compareTo(BigDecimal.ZERO) > 0 ? montoFinal : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public List<Cuota> getAllCuotas(){ return cuotaRepository.findAll(); }

    @Transactional(readOnly = true)
    public Optional<Cuota> getCuotaById(Long id){ return cuotaRepository.findById(id); }

    @Transactional
    public Optional<Long> saveCuota(CuotaDTO cuotaTransfer){
        Cuota cuotaCreate = new Cuota();
        Optional<Persona> personaOpt = personaRepository.findById(cuotaTransfer.getPersonaId());
        Optional<Deporte> deporteOpt = deporteRepository.findById(cuotaTransfer.getDeporteId());
        if(personaOpt.isEmpty() || deporteOpt.isEmpty()) {
            return Optional.empty();
        }
        Persona personaExisting = personaOpt.get();
        Deporte deporteExisting = deporteOpt.get();
        cuotaCreate.setPersonaId(personaExisting);
        cuotaCreate.setDeporteId(deporteExisting);
        cuotaCreate.setPeriodo(cuotaTransfer.getPeriodo());
        
        BigDecimal cuotaEntrenador = deporteExisting.getCuotaEntrenador() != null ? deporteExisting.getCuotaEntrenador() : BigDecimal.ZERO;
        BigDecimal cuotaSeguro = deporteExisting.getCuotaSeguro() != null ? deporteExisting.getCuotaSeguro() : BigDecimal.ZERO;
        BigDecimal cuotaSocial = deporteExisting.getCuotaSocial() != null ? deporteExisting.getCuotaSocial() : BigDecimal.ZERO;
        BigDecimal montoBase = cuotaEntrenador.add(cuotaSeguro).add(cuotaSocial);

        Promocion promocion = personaExisting.getPromocion();
        BigDecimal montoFinal = aplicarDescuentoPromocion(montoBase, promocion);

        cuotaCreate.setCuotaEntrenador(cuotaEntrenador);
        cuotaCreate.setCuotaSeguro(cuotaSeguro);
        cuotaCreate.setCuotaSocial(cuotaSocial);
        cuotaCreate.setMonto(montoFinal);
        
        cuotaCreate.setEstado(cuotaTransfer.getEstado());
        if(cuotaTransfer.getFechaVencimiento() != null) cuotaCreate.setFechaVencimiento(cuotaTransfer.getFechaVencimiento());
        if(cuotaTransfer.getConcepto() != null) cuotaCreate.setConcepto(cuotaTransfer.getConcepto());
        cuotaCreate.setFechaGeneracion(LocalDate.now());
        Cuota cuotaCreated = cuotaRepository.save(cuotaCreate);
        return Optional.of(cuotaCreated.getId());
    }

    @Transactional
    public boolean changeStateCuota(Long id, EstadoCuota estado){
        boolean b = false;
        Optional<Cuota> cuota = getCuotaById(id);
        if(cuota.isPresent()){
            cuota.get().setEstado(estado);
            b = true;
        }
        return b;
    }

    @Transactional
    public int generarCuotasMesActual(){
        LocalDate hoy = LocalDate.now();
        LocalDate primerDiaMes = hoy.withDayOfMonth(1);
        LocalDate primerDiaMesSiguiente = YearMonth.from(hoy).plusMonths(1).atDay(1);
        
        List<Inscripcion> inscripcionesActivas = inscripcionRepository.findAllActive();
        int cuotasGeneradas = 0;
        
        for (Inscripcion inscripcion : inscripcionesActivas) {
            Long personaId = inscripcion.getPersonaId().getId();
            Long deporteId = inscripcion.getDeporteId().getId();
            
            Optional<Cuota> cuotaExistente = cuotaRepository.findByPersonaDeporteAndPeriodo(
                personaId, deporteId, primerDiaMes
            );
            
            if (cuotaExistente.isEmpty()) {
                Cuota nuevaCuota = new Cuota();
                nuevaCuota.setPersonaId(inscripcion.getPersonaId());
                nuevaCuota.setDeporteId(inscripcion.getDeporteId());
                nuevaCuota.setPeriodo(primerDiaMes);
                
                // Aplicar descuentos de promociones si la persona los tiene
                BigDecimal cuotaEntrenador = inscripcion.getDeporteId().getCuotaEntrenador() != null ? inscripcion.getDeporteId().getCuotaEntrenador() : BigDecimal.ZERO;
                BigDecimal cuotaSeguro = inscripcion.getDeporteId().getCuotaSeguro() != null ? inscripcion.getDeporteId().getCuotaSeguro() : BigDecimal.ZERO;
                BigDecimal cuotaSocial = inscripcion.getDeporteId().getCuotaSocial() != null ? inscripcion.getDeporteId().getCuotaSocial() : BigDecimal.ZERO;
                BigDecimal montoBase = cuotaEntrenador.add(cuotaSeguro).add(cuotaSocial);
                Promocion promocion = inscripcion.getPersonaId().getPromocion();
                BigDecimal montoFinal = aplicarDescuentoPromocion(montoBase, promocion);
                nuevaCuota.setCuotaEntrenador(cuotaEntrenador);
                nuevaCuota.setCuotaSeguro(cuotaSeguro);
                nuevaCuota.setCuotaSocial(cuotaSocial);
                nuevaCuota.setMonto(montoFinal);
                
                nuevaCuota.setEstado(EstadoCuota.GENERADA);
                nuevaCuota.setFechaVencimiento(primerDiaMesSiguiente);
                nuevaCuota.setFechaGeneracion(hoy);
                nuevaCuota.setConcepto("");
                
                cuotaRepository.save(nuevaCuota);
                cuotasGeneradas++;
            }
        }
        
        return cuotasGeneradas;
    }

    @Transactional
    public int actualizarCuotasVencidas(){
        LocalDate hoy = LocalDate.now();
        List<Cuota> cuotas = cuotaRepository.findAll();
        int cuotasVencidas = 0;
        
        for (Cuota cuota : cuotas) {
            // Si la cuota está en GENERADA y su fecha de vencimiento es <= hoy, marcarla como VENCIDA
            if (cuota.getEstado() == EstadoCuota.GENERADA && 
                cuota.getFechaVencimiento() != null && 
                !cuota.getFechaVencimiento().isAfter(hoy)) {
                cuota.setEstado(EstadoCuota.VENCIDA);
                cuotasVencidas++;
            }
        }
        
        return cuotasVencidas;
    }

}
