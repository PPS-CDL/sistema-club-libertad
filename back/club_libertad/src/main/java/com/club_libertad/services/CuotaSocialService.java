package com.club_libertad.services;
import com.club_libertad.enums.CategoriaPersona;
import com.club_libertad.models.ConfiguracionClub;
import com.club_libertad.models.CuotaSocial;
import com.club_libertad.models.GrupoFamiliar;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.CuotaSocialRepository;
import com.club_libertad.repositories.PersonaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class CuotaSocialService {
    private final CuotaSocialRepository cuotaSocialRepository;
    private final PersonaRepository personaRepository;
    private final ConfiguracionClubService configuracionClubService;

    public CuotaSocialService(CuotaSocialRepository cuotaSocialRepository, 
                              PersonaRepository personaRepository,
                              ConfiguracionClubService configuracionClubService) {
        this.cuotaSocialRepository = cuotaSocialRepository;
        this.personaRepository = personaRepository;
        this.configuracionClubService = configuracionClubService;
    }
@Transactional(readOnly = true)
public List<CuotaSocial> getAllCuotasSociales() {
    return cuotaSocialRepository.findAll();
}

    @Transactional
    public void prepararCambioIntegrantesGrupo(Long grupoId, boolean cambioIntegrantes) {
        if (!cambioIntegrantes) return;

        ConfiguracionClub config = configuracionClubService.getConfiguracionForUpdate();
        if (config.getFechaEfectiva() == null
                || YearMonth.now().atDay(1).isBefore(config.getFechaEfectiva())) return;

        String periodo = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        Optional<CuotaSocial> cuotaOpt = cuotaSocialRepository.findActivaByGrupoAndPeriodo(grupoId, periodo);
        if (cuotaOpt.isEmpty()) return;

        CuotaSocial cuota = cuotaOpt.get();
        if ("PAGADA".equals(cuota.getEstado())) {
            throw new IllegalStateException("No se pueden cambiar integrantes mientras la cuota familiar del período está pagada.");
        }
        cuota.setEstado("CANCELADA");
        cuotaSocialRepository.save(cuota);
    }

    @Transactional
    public void sincronizarCuotasSocialesMesActual() {
        generarCuotasSocialesMesActual();
    }

    @Transactional
    public void generarCuotasSocialesMesActual() {
        ConfiguracionClub config = configuracionClubService.getConfiguracionForUpdate();
        LocalDate fechaEfectiva = config.getFechaEfectiva();
        if (fechaEfectiva == null) return;

        YearMonth mesActual = YearMonth.now();
        LocalDate inicioPeriodo = mesActual.atDay(1);
        if (inicioPeriodo.isBefore(fechaEfectiva)) return;

        String periodo = mesActual.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        LocalDate fechaVencimiento = mesActual.atDay(10);
        if (LocalDate.now().isAfter(fechaVencimiento)) {
            fechaVencimiento = LocalDate.now().plusDays(5);
        }

        java.util.Set<Long> gruposConCuotaFamiliarPagada = new java.util.HashSet<>();
        for (CuotaSocial cuota : cuotaSocialRepository.findByPeriodoForUpdate(periodo)) {
            GrupoFamiliar grupoCuota = cuota.getGrupoFamiliar();
            if ("FAMILIAR".equals(cuota.getTipoCuota()) && "PAGADA".equals(cuota.getEstado())
                    && grupoCuota != null) {
                gruposConCuotaFamiliarPagada.add(grupoCuota.getId());
            }
            if (!"PENDIENTE".equals(cuota.getEstado()) && !"VENCIDA".equals(cuota.getEstado())) continue;

            boolean cancelar = false;
            if ("INDIVIDUAL".equals(cuota.getTipoCuota())) {
                Persona socio = cuota.getSocio();
                cancelar = !Boolean.TRUE.equals(socio.getActivo())
                        || socio.getCategoria() == CategoriaPersona.JUGADOR
                        || esGrupoFamiliarValido(socio.getGrupoFamiliar());
            } else if ("FAMILIAR".equals(cuota.getTipoCuota())) {
                cancelar = !esGrupoFamiliarValido(grupoCuota);
            }
            if (cancelar) {
                cuota.setEstado("CANCELADA");
                cuotaSocialRepository.save(cuota);
            }
        }

        List<Persona> sociosActivos = personaRepository.findAll().stream()
                .filter(persona -> Boolean.TRUE.equals(persona.getActivo()))
                .toList();
        for (Persona persona : sociosActivos) {
            if (persona.getCategoria() == CategoriaPersona.JUGADOR) continue;

            GrupoFamiliar grupo = persona.getGrupoFamiliar();
            if (grupo != null) {
                if (esGrupoFamiliarValido(grupo)) {
                    boolean integranteYaPagoIndividual = false;
                    for (Persona integrante : integrantesDe(grupo)) {
                        if (Boolean.TRUE.equals(integrante.getActivo())
                                && integrante.getCategoria() != CategoriaPersona.JUGADOR) {
                            boolean pagoIndividualExistente = cancelarCuotaIndividualPendiente(integrante, periodo);
                            integranteYaPagoIndividual = integranteYaPagoIndividual || pagoIndividualExistente;
                        }
                    }
                    Persona responsable = grupo.getResponsable();
                    if (responsable.getId().equals(persona.getId())) {
                        if (integranteYaPagoIndividual) {
                            cancelarCuotaFamiliarPendiente(grupo, periodo);
                        } else {
                            procesarCuotaFamiliar(responsable, grupo, periodo,
                                    config.getImporteCuotaFamiliar(), fechaVencimiento);
                        }
                    }
                    continue;
                }
                if (gruposConCuotaFamiliarPagada.contains(grupo.getId())) continue;
            }

            procesarCuotaIndividual(persona, periodo,
                    config.getImporteCuotaIndividual(), fechaVencimiento);
        }
    }

    private List<Persona> integrantesDe(GrupoFamiliar grupo) {
        List<Persona> integrantes = new java.util.ArrayList<>(grupo.getIntegrantes());
        Persona responsable = grupo.getResponsable();
        if (responsable != null && integrantes.stream()
                .noneMatch(integrante -> java.util.Objects.equals(integrante.getId(), responsable.getId()))) {
            integrantes.add(responsable);
        }
        return integrantes;
    }

    private boolean esGrupoFamiliarValido(GrupoFamiliar grupo) {
        if (grupo == null) return false;
        Persona responsable = grupo.getResponsable();
        if (responsable == null || !Boolean.TRUE.equals(responsable.getActivo())
                || (responsable.getCategoria() != CategoriaPersona.SOCIO
                && responsable.getCategoria() != CategoriaPersona.SOCIOYJUGADOR)) return false;
        List<Persona> integrantes = integrantesDe(grupo);
        return integrantes.size() >= 3
                && integrantes.stream().allMatch(integrante -> Boolean.TRUE.equals(integrante.getActivo()));
    }

    private boolean cancelarCuotaIndividualPendiente(Persona socio, String periodo) {
        Optional<CuotaSocial> cuotaOpt = cuotaSocialRepository
                .findActivaBySocioAndPeriodo(socio.getId(), periodo);
        if (cuotaOpt.isEmpty() || !"INDIVIDUAL".equals(cuotaOpt.get().getTipoCuota())) return false;

        CuotaSocial cuota = cuotaOpt.get();
        if ("PAGADA".equals(cuota.getEstado())) return true;
        if ("PENDIENTE".equals(cuota.getEstado()) || "VENCIDA".equals(cuota.getEstado())) {
            cuota.setEstado("CANCELADA");
            cuotaSocialRepository.save(cuota);
        }
        return false;
    }

    private void cancelarCuotaFamiliarPendiente(GrupoFamiliar grupo, String periodo) {
        Optional<CuotaSocial> cuotaOpt = cuotaSocialRepository
                .findActivaByGrupoAndPeriodo(grupo.getId(), periodo);
        if (cuotaOpt.isPresent() && ("PENDIENTE".equals(cuotaOpt.get().getEstado())
                || "VENCIDA".equals(cuotaOpt.get().getEstado()))) {
            cuotaOpt.get().setEstado("CANCELADA");
            cuotaSocialRepository.save(cuotaOpt.get());
        }
    }

    private void procesarCuotaFamiliar(Persona responsable, GrupoFamiliar grupo, String periodo, BigDecimal monto, LocalDate vencimiento) {
        Optional<CuotaSocial> cuotaExistenteOpt = cuotaSocialRepository.findActivaByGrupoAndPeriodo(grupo.getId(), periodo);

        if (cuotaExistenteOpt.isPresent()) {
            CuotaSocial cuotaExistente = cuotaExistenteOpt.get();
            
            // Si el responsable cambió
            if (!cuotaExistente.getSocio().getId().equals(responsable.getId())) {
                if (cuotaExistente.getEstado().equals("PAGADA")) {
                    // Si ya está pagada por el responsable anterior, no se hace nada (el mes está saldado)
                    return;
                } else {
                    // Si está PENDIENTE o VENCIDA, se cancela la del responsable viejo y se crea la nueva
                    cuotaExistente.setEstado("CANCELADA");
                    cuotaSocialRepository.save(cuotaExistente);
                    crearNuevaCuota(responsable, grupo, "FAMILIAR", periodo, monto, vencimiento);
                }
            }
            // Si el responsable es el mismo, ya existe la cuota, no se hace nada
        } else {
            // No existe cuota para este grupo en este periodo
            crearNuevaCuota(responsable, grupo, "FAMILIAR", periodo, monto, vencimiento);
        }
    }

    private void procesarCuotaIndividual(Persona socio, String periodo, BigDecimal monto, LocalDate vencimiento) {
        Optional<CuotaSocial> cuotaExistente = cuotaSocialRepository.findActivaBySocioAndPeriodo(socio.getId(), periodo);
        
        if (cuotaExistente.isEmpty()) {
            crearNuevaCuota(socio, null, "INDIVIDUAL", periodo, monto, vencimiento);
        }
    }

    private void crearNuevaCuota(Persona socio, GrupoFamiliar grupo, String tipo, String periodo, BigDecimal monto, LocalDate vencimiento) {
        CuotaSocial nueva = new CuotaSocial();
        nueva.setSocio(socio);
        nueva.setGrupoFamiliar(grupo);
        nueva.setTipoCuota(tipo);
        nueva.setPeriodo(periodo);
        nueva.setMonto(monto);
        nueva.setEstado("PENDIENTE");
        nueva.setFechaGeneracion(LocalDate.now());
        nueva.setFechaVencimiento(vencimiento);
        nueva.setConcepto("Cuota Social " + (tipo.equals("FAMILIAR") ? "Familiar" : "Individual") + " - " + periodo);
        
        cuotaSocialRepository.save(nueva);
    }
}