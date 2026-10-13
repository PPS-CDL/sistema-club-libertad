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

    @Transactional
    public void generarCuotasSocialesMesActual() {
        ConfiguracionClub config = configuracionClubService.getConfiguracion();
        LocalDate fechaEfectiva = config.getFechaEfectiva();
        
        if (fechaEfectiva == null) return; // Sistema no configurado

        YearMonth mesActual = YearMonth.now();
        YearMonth mesEfectivo = YearMonth.from(fechaEfectiva);

        // Si el mes actual es anterior a la fecha efectiva, no se genera la cuota independiente
        if (mesActual.isBefore(mesEfectivo)) {
            return;
        }

        String periodo = mesActual.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        LocalDate fechaVencimiento = mesActual.atDay(10); // Ejemplo: Vence el 10 del mes
        if (LocalDate.now().isAfter(fechaVencimiento)) {
            fechaVencimiento = LocalDate.now().plusDays(5); // Dar margen si se genera tarde
        }

        List<Persona> sociosActivos = personaRepository.findAll().stream()
                .filter(Persona::getActivo)
                .toList();

        for (Persona persona : sociosActivos) {
            // Regla: JUGADOR no paga cuota social
            if (persona.getCategoria() == CategoriaPersona.JUGADOR) {
                continue;
            }

            GrupoFamiliar grupo = persona.getGrupoFamiliar();
            
            if (grupo != null) {
                // Validación del tamaño real del grupo (mínimo 3)
                int integrantesSize = grupo.getIntegrantes().size();
                boolean esGrupoValido = integrantesSize >= 3;

                if (esGrupoValido) {
                    if (grupo.getResponsable() != null && grupo.getResponsable().getId().equals(persona.getId())) {
                        procesarCuotaFamiliar(persona, grupo, periodo, config.getImporteCuotaFamiliar(), fechaVencimiento);
                    }
                    // Si no es el responsable, se ignora (ya está cubierto)
                    continue;
                }
            }

            // Si no tiene grupo o el grupo es inválido (< 3), se cobra INDIVIDUAL
            procesarCuotaIndividual(persona, periodo, config.getImporteCuotaIndividual(), fechaVencimiento);
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