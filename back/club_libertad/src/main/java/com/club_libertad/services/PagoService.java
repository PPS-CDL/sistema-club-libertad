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
    private final com.club_libertad.repositories.CuotaSocialRepository cuotaSocialRepository;
    private final com.club_libertad.repositories.PersonaRepository personaRepository;

    public PagoService(PagoRepository pagoRepository, CuotaRepository cuotaRepository, DeporteRepository deporteRepository, com.club_libertad.repositories.CuotaSocialRepository cuotaSocialRepository, com.club_libertad.repositories.PersonaRepository personaRepository) {
        this.pagoRepository = pagoRepository;
        this.cuotaRepository = cuotaRepository;
        this.deporteRepository = deporteRepository;
        this.cuotaSocialRepository = cuotaSocialRepository;
        this.personaRepository = personaRepository;
    }

    @Transactional(readOnly = true)
    public List<Pago> getAllPagos(){ return pagoRepository.findAll(); }

    @Transactional(readOnly = true)
    public Optional<Pago> getPagoById(Long id){ return pagoRepository.findById(id); }

    @Transactional
    public Optional<Long> savePago(PagoDTO pagoTransfer){
        if (pagoTransfer == null || pagoTransfer.getSocioId() == null || pagoTransfer.getFechaPago() == null) {
            throw new IllegalArgumentException("El socio y la fecha del pago son obligatorios.");
        }

        List<Long> cuotaIds = pagoTransfer.getCuotaIds() == null ? List.of() : pagoTransfer.getCuotaIds();
        List<Long> cuotaSocialIds = pagoTransfer.getCuotaSocialIds() == null ? List.of() : pagoTransfer.getCuotaSocialIds();
        validarIdsUnicos(cuotaIds, "deportivas");
        validarIdsUnicos(cuotaSocialIds, "sociales");
        if (cuotaIds.isEmpty() && cuotaSocialIds.isEmpty()) {
            throw new IllegalArgumentException("El pago debe incluir al menos una cuota.");
        }

        Persona socio = personaRepository.findById(pagoTransfer.getSocioId())
                .orElseThrow(() -> new IllegalArgumentException("El socio indicado no existe."));

        List<Cuota> cuotasDeportivas = new ArrayList<>();
        for (Long cuotaId : cuotaIds.stream().sorted().toList()) {
            Cuota cuota = cuotaRepository.findByIdForUpdate(cuotaId)
                    .orElseThrow(() -> new IllegalArgumentException("No existe la cuota deportiva " + cuotaId + "."));
            if (!cuota.getPersonaId().getId().equals(socio.getId())) {
                throw new IllegalArgumentException("La cuota deportiva no pertenece al socio indicado.");
            }
            if (cuota.getEstado() == EstadoCuota.PAGADA || cuota.getPagoId() != null) {
                throw new IllegalArgumentException("La cuota deportiva ya fue pagada.");
            }
            cuotasDeportivas.add(cuota);
        }

        List<com.club_libertad.models.CuotaSocial> cuotasSociales = new ArrayList<>();
        for (Long cuotaSocialId : cuotaSocialIds.stream().sorted().toList()) {
            com.club_libertad.models.CuotaSocial cuotaSocial = cuotaSocialRepository.findByIdForUpdate(cuotaSocialId)
                    .orElseThrow(() -> new IllegalArgumentException("No existe la cuota social " + cuotaSocialId + "."));
            if (!cuotaSocial.getSocio().getId().equals(socio.getId())) {
                throw new IllegalArgumentException("La cuota social no pertenece al socio indicado.");
            }
            if ("PAGADA".equals(cuotaSocial.getEstado()) || "CANCELADA".equals(cuotaSocial.getEstado())
                    || cuotaSocial.getPagoId() != null) {
                throw new IllegalArgumentException("La cuota social ya no está pendiente de pago.");
            }
            cuotasSociales.add(cuotaSocial);
        }

        BigDecimal totalEntrenador = BigDecimal.ZERO;
        BigDecimal totalSeguro = BigDecimal.ZERO;
        BigDecimal totalSocial = BigDecimal.ZERO;
        BigDecimal montoTotal = BigDecimal.ZERO;
        for (Cuota cuota : cuotasDeportivas) {
            totalEntrenador = totalEntrenador.add(valorOZero(cuota.getCuotaEntrenador()));
            totalSeguro = totalSeguro.add(valorOZero(cuota.getCuotaSeguro()));
            totalSocial = totalSocial.add(valorOZero(cuota.getCuotaSocial()));
            montoTotal = montoTotal.add(valorOZero(cuota.getMonto()));
        }
        for (com.club_libertad.models.CuotaSocial cuotaSocial : cuotasSociales) {
            totalSocial = totalSocial.add(valorOZero(cuotaSocial.getMonto()));
            montoTotal = montoTotal.add(valorOZero(cuotaSocial.getMonto()));
        }

        Pago pagoCreate = new Pago();
        pagoCreate.setSocioId(socio);
        pagoCreate.setFechaPago(pagoTransfer.getFechaPago());
        pagoCreate.setMetodoPago(pagoTransfer.getMetodoPago());
        pagoCreate.setObservaciones(pagoTransfer.getObservaciones());
        pagoCreate.setCuotaEntrenador(totalEntrenador);
        pagoCreate.setCuotaSeguro(totalSeguro);
        pagoCreate.setCuotaSocial(totalSocial);
        pagoCreate.setMontoTotal(montoTotal);
        Pago pagoCreated = pagoRepository.save(pagoCreate);

        for (Cuota cuota : cuotasDeportivas) {
            cuota.setPagoId(pagoCreated);
            cuota.setEstado(EstadoCuota.PAGADA);
        }
        cuotaRepository.saveAll(cuotasDeportivas);
            if (!cuotasDeportivas.isEmpty()) cuotaRepository.saveAll(cuotasDeportivas);
        for (com.club_libertad.models.CuotaSocial cuotaSocial : cuotasSociales) {
            cuotaSocial.setPagoId(pagoCreated.getId());
            cuotaSocial.setEstado("PAGADA");
        }
        if (!cuotasSociales.isEmpty()) cuotaSocialRepository.saveAll(cuotasSociales);

        return Optional.of(pagoCreated.getId());
    }

    private void validarIdsUnicos(List<Long> ids, String tipo) {
        if (ids.stream().anyMatch(Objects::isNull) || new HashSet<>(ids).size() != ids.size()) {
            throw new IllegalArgumentException("Los IDs de cuotas " + tipo + " son inválidos o están repetidos.");
        }
    }

    private BigDecimal valorOZero(BigDecimal valor) {
        return valor != null ? valor : BigDecimal.ZERO;
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
        // Si no se especifica un deporte, también se incluyen los ingresos de las cuotas sociales independientes
        if (deporteId == null) {
            List<com.club_libertad.models.CuotaSocial> cuotasSociales = cuotaSocialRepository
                .findCobradasPorFecha(fecha, fechaDesde, fechaHasta);
            BigDecimal totalSocialIndependiente = cuotasSociales.stream()
                .map(cuota -> valorOZero(cuota.getMonto()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (!cuotasSociales.isEmpty()) {
            resultado.add(new IngresosPorDeporteDTO(
                        0L, "Cuota Social", (long) cuotasSociales.size(), totalSocialIndependiente,
                BigDecimal.ZERO, BigDecimal.ZERO, totalSocialIndependiente));
            }
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

        List<ResumenMensualPorDeporteDTO> resultado = new ArrayList<>(deportesAProcesar.stream().map(dep -> {
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
        }).toList());

        if (deporteId == null) {
            String periodo = String.format("%04d-%02d", anio, mes);
            List<com.club_libertad.models.CuotaSocial> cuotasSociales = cuotaSocialRepository.findByPeriodo(periodo).stream()
                .filter(cuota -> !"CANCELADA".equals(cuota.getEstado()))
                .toList();
            if (!cuotasSociales.isEmpty()) {
            List<com.club_libertad.models.CuotaSocial> pagadas = cuotasSociales.stream()
                .filter(cuota -> "PAGADA".equals(cuota.getEstado())).toList();
            List<com.club_libertad.models.CuotaSocial> adeudadas = cuotasSociales.stream()
                .filter(cuota -> "PENDIENTE".equals(cuota.getEstado()) || "VENCIDA".equals(cuota.getEstado()))
                .toList();
            BigDecimal totalCobradoSocial = pagadas.stream()
                .map(cuota -> valorOZero(cuota.getMonto())).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalAdeudadoSocial = adeudadas.stream()
                .map(cuota -> valorOZero(cuota.getMonto())).reduce(BigDecimal.ZERO, BigDecimal::add);
            resultado.add(ResumenMensualPorDeporteDTO.builder()
                .deporteId(0L)
                .nombreDeporte("Cuota Social")
                .sociosAlDia(pagadas.stream().map(cuota -> cuota.getSocio().getId()).distinct().count())
                .sociosDeudores(adeudadas.stream().map(cuota -> cuota.getSocio().getId()).distinct().count())
                .totalCobrado(totalCobradoSocial)
                .totalAdeudado(totalAdeudadoSocial)
                .cobradoSocial(totalCobradoSocial)
                .cobradoEntrenador(BigDecimal.ZERO)
                .cobradoSeguro(BigDecimal.ZERO)
                .adeudadoSocial(totalAdeudadoSocial)
                .adeudadoEntrenador(BigDecimal.ZERO)
                .adeudadoSeguro(BigDecimal.ZERO)
                .build());
            }
        }
        return resultado;
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