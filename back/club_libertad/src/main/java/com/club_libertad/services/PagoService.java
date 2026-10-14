package com.club_libertad.services;

import com.club_libertad.dtos.IngresoPorSocioDTO;
import com.club_libertad.dtos.IngresosPorDeporteDTO;
import com.club_libertad.dtos.ResumenMensualPorDeporteDTO;
import com.club_libertad.dtos.PagoDTO;
import com.club_libertad.enums.EstadoCuota;
import com.club_libertad.models.Cuota;
import com.club_libertad.models.Deporte;
import com.club_libertad.models.Pago;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.CuotaRepository;
import com.club_libertad.repositories.DeporteRepository;
import com.club_libertad.repositories.PagoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PagoService {
    private final PagoRepository pagoRepository;
    private final CuotaRepository cuotaRepository;
    private final DeporteRepository deporteRepository;
    
    public PagoService(PagoRepository pagoRepository, CuotaRepository cuotaRepository, DeporteRepository deporteRepository) {
        this.pagoRepository = pagoRepository;
        this.cuotaRepository = cuotaRepository;
        this.deporteRepository = deporteRepository;
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
        
        Pago pagoCreated = pagoRepository.save(pagoCreate);
        
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

    @Transactional(readOnly = true)
    public List<IngresoPorSocioDTO> getIngresosPorSocio() {
        return pagoRepository.findIngresosPorSocio();
    }

    @Transactional(readOnly = true)
    public List<Pago> getPagosPorFechaORango(LocalDate fecha, LocalDate fechaDesde, LocalDate fechaHasta) {
        if (fecha != null) {
            return pagoRepository.findByFechaPago(fecha);
        } else if (fechaDesde != null && fechaHasta != null) {
            return pagoRepository.findByFechaPagoBetween(fechaDesde, fechaHasta);
        } else if (fechaDesde != null) {
            return pagoRepository.findByFechaPagoGreaterThanEqual(fechaDesde);
        } else if (fechaHasta != null) {
            return pagoRepository.findByFechaPagoLessThanEqual(fechaHasta);
        }
        return pagoRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getResumenIngresos(LocalDate fecha, LocalDate fechaDesde, LocalDate fechaHasta) {
        List<Pago> pagos = getPagosPorFechaORango(fecha, fechaDesde, fechaHasta);

        BigDecimal totalRecaudado = BigDecimal.ZERO;
        BigDecimal totalEntrenador = BigDecimal.ZERO;
        BigDecimal totalSeguro = BigDecimal.ZERO;
        BigDecimal totalSocial = BigDecimal.ZERO;

        for (Pago p : pagos) {
            if (p.getMontoTotal() != null) totalRecaudado = totalRecaudado.add(p.getMontoTotal());
            if (p.getCuotaEntrenador() != null) totalEntrenador = totalEntrenador.add(p.getCuotaEntrenador());
            if (p.getCuotaSeguro() != null) totalSeguro = totalSeguro.add(p.getCuotaSeguro());
            if (p.getCuotaSocial() != null) totalSocial = totalSocial.add(p.getCuotaSocial());
        }

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("cantidadIngresos", pagos.size());
        resumen.put("montoTotal", totalRecaudado);
        resumen.put("totalEntrenador", totalEntrenador);
        resumen.put("totalSeguro", totalSeguro);
        resumen.put("totalSocial", totalSocial);
        resumen.put("fecha", fecha);
        resumen.put("fechaDesde", fechaDesde);
        resumen.put("fechaHasta", fechaHasta);

        return resumen;
    }

    @Transactional(readOnly = true)
    public List<IngresosPorDeporteDTO> getIngresosPorDeporte(LocalDate fecha, LocalDate fechaDesde, LocalDate fechaHasta, Long deporteId) {
        List<Cuota> cuotas = getCuotasCobradasPorFechaYDeporte(fecha, fechaDesde, fechaHasta, deporteId);

        Map<Long, List<Cuota>> cuotasPorDeporte = cuotas.stream()
                .filter(c -> c.getDeporteId() != null)
                .collect(Collectors.groupingBy(c -> c.getDeporteId().getId(), LinkedHashMap::new, Collectors.toList()));

        List<IngresosPorDeporteDTO> resultado = new ArrayList<>();
        for (Map.Entry<Long, List<Cuota>> entry : cuotasPorDeporte.entrySet()) {
            List<Cuota> cuotasDep = entry.getValue();
            Deporte dep = cuotasDep.get(0).getDeporteId();

            long cantidad = cuotasDep.size();
            BigDecimal totalSocial = BigDecimal.ZERO;
            BigDecimal totalEntrenador = BigDecimal.ZERO;
            BigDecimal totalSeguro = BigDecimal.ZERO;
            BigDecimal montoTotal = BigDecimal.ZERO;

            for (Cuota c : cuotasDep) {
                montoTotal = montoTotal.add(c.getMonto() != null ? c.getMonto() : BigDecimal.ZERO);
                DesgloseProrrateado d = prorratearCuota(c);
                totalSocial = totalSocial.add(d.getSocial());
                totalEntrenador = totalEntrenador.add(d.getEntrenador());
                totalSeguro = totalSeguro.add(d.getSeguro());
            }

            resultado.add(new IngresosPorDeporteDTO(
                    dep.getId(),
                    dep.getNombre(),
                    cantidad,
                    totalSocial,
                    totalEntrenador,
                    totalSeguro,
                    montoTotal
            ));
        }

        resultado.sort(Comparator.comparing(IngresosPorDeporteDTO::getNombreDeporte, String.CASE_INSENSITIVE_ORDER));
        return resultado;
    }

    @Transactional(readOnly = true)
    public List<Cuota> getCuotasCobradasPorFechaYDeporte(LocalDate fecha, LocalDate fechaDesde, LocalDate fechaHasta, Long deporteId) {
        if (fecha != null) {
            return cuotaRepository.findCuotasCobradasPorFechaYDeporte(fecha, null, null, deporteId);
        }
        return cuotaRepository.findCuotasCobradasPorFechaYDeporte(null, fechaDesde, fechaHasta, deporteId);
    }

    @Transactional(readOnly = true)
    public List<ResumenMensualPorDeporteDTO> getResumenMensualPorDeporte(int anio, int mes, Long deporteId) {
        List<Cuota> cuotas = cuotaRepository.findCuotasPorMesAnioYDeporte(anio, mes, deporteId);
        Map<Long, List<Cuota>> cuotasPorDeporte = cuotas.stream()
                .collect(Collectors.groupingBy(c -> c.getDeporteId().getId()));

        List<Deporte> deportesAProcesar;
        if (deporteId != null) {
            deportesAProcesar = deporteRepository.findById(deporteId)
                    .map(List::of)
                    .orElse(List.of());
        } else {
            deportesAProcesar = deporteRepository.findAll();
        }

        return deportesAProcesar.stream().map(dep -> {
            List<Cuota> cuotasDep = cuotasPorDeporte.getOrDefault(dep.getId(), List.of());

            long sociosAlDia = cuotasDep.stream()
                    .filter(c -> c.getEstado() == EstadoCuota.PAGADA)
                    .map(c -> c.getPersonaId().getId())
                    .distinct()
                    .count();

            long sociosDeudores = cuotasDep.stream()
                    .filter(c -> c.getEstado() != EstadoCuota.PAGADA)
                    .map(c -> c.getPersonaId().getId())
                    .distinct()
                    .count();

            BigDecimal totalCobrado = BigDecimal.ZERO;
            BigDecimal cobradoSocial = BigDecimal.ZERO;
            BigDecimal cobradoEntrenador = BigDecimal.ZERO;
            BigDecimal cobradoSeguro = BigDecimal.ZERO;

            BigDecimal totalAdeudado = BigDecimal.ZERO;
            BigDecimal adeudadoSocial = BigDecimal.ZERO;
            BigDecimal adeudadoEntrenador = BigDecimal.ZERO;
            BigDecimal adeudadoSeguro = BigDecimal.ZERO;

            for (Cuota c : cuotasDep) {
                DesgloseProrrateado d = prorratearCuota(c);
                if (c.getEstado() == EstadoCuota.PAGADA) {
                    totalCobrado = totalCobrado.add(c.getMonto() != null ? c.getMonto() : BigDecimal.ZERO);
                    cobradoSocial = cobradoSocial.add(d.getSocial());
                    cobradoEntrenador = cobradoEntrenador.add(d.getEntrenador());
                    cobradoSeguro = cobradoSeguro.add(d.getSeguro());
                } else {
                    totalAdeudado = totalAdeudado.add(c.getMonto() != null ? c.getMonto() : BigDecimal.ZERO);
                    adeudadoSocial = adeudadoSocial.add(d.getSocial());
                    adeudadoEntrenador = adeudadoEntrenador.add(d.getEntrenador());
                    adeudadoSeguro = adeudadoSeguro.add(d.getSeguro());
                }
            }

            return ResumenMensualPorDeporteDTO.builder()
                    .deporteId(dep.getId())
                    .nombreDeporte(dep.getNombre())
                    .sociosAlDia(sociosAlDia)
                    .sociosDeudores(sociosDeudores)
                    .totalCobrado(totalCobrado)
                    .totalAdeudado(totalAdeudado)
                    .cobradoSocial(cobradoSocial)
                    .cobradoEntrenador(cobradoEntrenador)
                    .cobradoSeguro(cobradoSeguro)
                    .adeudadoSocial(adeudadoSocial)
                    .adeudadoEntrenador(adeudadoEntrenador)
                    .adeudadoSeguro(adeudadoSeguro)
                    .build();
        }).toList();
    }

    private static class DesgloseProrrateado {
        private final BigDecimal social;
        private final BigDecimal entrenador;
        private final BigDecimal seguro;

        public DesgloseProrrateado(BigDecimal social, BigDecimal entrenador, BigDecimal seguro) {
            this.social = social;
            this.entrenador = entrenador;
            this.seguro = seguro;
        }

        public BigDecimal getSocial() { return social; }
        public BigDecimal getEntrenador() { return entrenador; }
        public BigDecimal getSeguro() { return seguro; }
    }

    private DesgloseProrrateado prorratearCuota(Cuota c) {
        BigDecimal socialNominal = c.getCuotaSocial() != null ? c.getCuotaSocial() : BigDecimal.ZERO;
        BigDecimal entrenadorNominal = c.getCuotaEntrenador() != null ? c.getCuotaEntrenador() : BigDecimal.ZERO;
        BigDecimal seguroNominal = c.getCuotaSeguro() != null ? c.getCuotaSeguro() : BigDecimal.ZERO;
        BigDecimal montoReal = c.getMonto() != null ? c.getMonto() : BigDecimal.ZERO;

        BigDecimal totalNominal = socialNominal.add(entrenadorNominal).add(seguroNominal);

        if (totalNominal.compareTo(BigDecimal.ZERO) <= 0 || montoReal.compareTo(BigDecimal.ZERO) <= 0) {
            return new DesgloseProrrateado(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        if (totalNominal.compareTo(montoReal) == 0) {
            return new DesgloseProrrateado(socialNominal, entrenadorNominal, seguroNominal);
        }

        BigDecimal factor = montoReal.divide(totalNominal, 6, RoundingMode.HALF_UP);
        BigDecimal socialReal = socialNominal.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        BigDecimal entrenadorReal = entrenadorNominal.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        BigDecimal seguroReal = montoReal.subtract(socialReal).subtract(entrenadorReal);

        return new DesgloseProrrateado(socialReal, entrenadorReal, seguroReal);
    }
}