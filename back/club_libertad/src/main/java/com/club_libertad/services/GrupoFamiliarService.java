package com.club_libertad.services;
import com.club_libertad.dtos.GrupoFamiliarDTO;
import com.club_libertad.models.GrupoFamiliar;
import com.club_libertad.models.Persona;
import com.club_libertad.repositories.GrupoFamiliarRepository;
import com.club_libertad.repositories.PersonaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GrupoFamiliarService {
    private final GrupoFamiliarRepository grupoFamiliarRepository;
    private final PersonaRepository personaRepository;

    public GrupoFamiliarService(GrupoFamiliarRepository grupoFamiliarRepository, PersonaRepository personaRepository) {
        this.grupoFamiliarRepository = grupoFamiliarRepository;
        this.personaRepository = personaRepository;
    }

    @Transactional(readOnly = true)
    public List<GrupoFamiliar> getAllGrupos() {
        return grupoFamiliarRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<GrupoFamiliar> getGrupoById(Long id) {
        return grupoFamiliarRepository.findById(id);
    }

    @Transactional
    public GrupoFamiliar saveGrupo(GrupoFamiliarDTO dto) {
        Persona responsable = personaRepository.findById(dto.getResponsableId())
                .orElseThrow(() -> new RuntimeException("Responsable no encontrado."));

        validarResponsable(responsable, null);

        List<Persona> integrantes = personaRepository.findAllById(dto.getIntegrantesIds());
        
        Set<Persona> todosLosMiembros = integrantes.stream().collect(Collectors.toSet());
        todosLosMiembros.add(responsable);

        if (todosLosMiembros.size() < 3 || todosLosMiembros.size() > 8) {
            throw new RuntimeException("El grupo familiar debe tener un mínimo de 3 y un máximo de 8 personas diferentes.");
        }

        for (Persona p : todosLosMiembros) {
            if (!p.getActivo()) {
                throw new RuntimeException("La persona " + p.getNombre() + " está inactiva y no puede pertenecer al grupo.");
            }
            if (p.getGrupoFamiliar() != null) {
                throw new RuntimeException("La persona " + p.getNombre() + " ya pertenece a un grupo familiar.");
            }
        }

        GrupoFamiliar grupo = new GrupoFamiliar();
        grupo.setNombre("Grupo familiar " + responsable.getApellido() );
        grupo.setResponsable(responsable);
        
        GrupoFamiliar savedGrupo = grupoFamiliarRepository.save(grupo);

        for (Persona p : todosLosMiembros) {
            p.setGrupoFamiliar(savedGrupo);
            personaRepository.save(p);
        }
        return savedGrupo;
    }
// Actualiza un grupo familiar existente. 
    @Transactional
    public GrupoFamiliar updateGrupo(Long id, GrupoFamiliarDTO dto) {
        GrupoFamiliar grupo = grupoFamiliarRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado."));

        Persona nuevoResponsable = personaRepository.findById(dto.getResponsableId())
                .orElseThrow(() -> new RuntimeException("Nuevo responsable no encontrado."));

        validarResponsable(nuevoResponsable, grupo.getId());

        List<Persona> nuevosIntegrantes = personaRepository.findAllById(dto.getIntegrantesIds());
        Set<Persona> todosLosMiembros = nuevosIntegrantes.stream().collect(Collectors.toSet());
        todosLosMiembros.add(nuevoResponsable);

        if (todosLosMiembros.size() < 3 || todosLosMiembros.size() > 8) {
            throw new RuntimeException("El grupo familiar debe tener un mínimo de 3 y un máximo de 8 personas diferentes.");
        }

        for (Persona p : todosLosMiembros) {
            if (!p.getActivo()) {
                throw new RuntimeException("La persona " + p.getNombre() + " está inactiva.");
            }
            if (p.getGrupoFamiliar() != null && !p.getGrupoFamiliar().getId().equals(grupo.getId())) {
                throw new RuntimeException("La persona " + p.getNombre() + " ya pertenece a otro grupo familiar.");
            }
        }

        // Desvincular a los que ya no están en la nueva lista
        if (grupo.getResponsable() != null && !todosLosMiembros.contains(grupo.getResponsable())) {
            grupo.getResponsable().setGrupoFamiliar(null);
            personaRepository.save(grupo.getResponsable());
        }
        grupo.getIntegrantes().forEach(p -> {
            if (!todosLosMiembros.contains(p)) {
                p.setGrupoFamiliar(null);
                personaRepository.save(p);
            }
        });

        grupo.setNombre("Grupo familiar " + nuevoResponsable.getApellido() );
        grupo.setResponsable(nuevoResponsable);
        
        for (Persona p : todosLosMiembros) {
            p.setGrupoFamiliar(grupo);
            personaRepository.save(p);
        }

        return grupoFamiliarRepository.save(grupo);
    }
// Funcion para eliminar un grupo familiar. 
    @Transactional
    public void deleteGrupo(Long id) {
        GrupoFamiliar grupo = grupoFamiliarRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado."));
        
        if (grupo.getResponsable() != null) {
            grupo.getResponsable().setGrupoFamiliar(null);
            personaRepository.save(grupo.getResponsable());
        }
        for (Persona p : grupo.getIntegrantes()) {
            p.setGrupoFamiliar(null);
            personaRepository.save(p);
        }
        grupoFamiliarRepository.delete(grupo);
    }

    private void validarResponsable(Persona responsable, Long grupoIdActual) {
        if (!responsable.getActivo()) {
            throw new RuntimeException("El responsable debe ser un socio activo.");
        }
        if (responsable.getGrupoFamiliar() != null && 
           (grupoIdActual == null || !responsable.getGrupoFamiliar().getId().equals(grupoIdActual))) {
            throw new RuntimeException("El responsable ya pertenece a otro grupo familiar.");
        }
        // Valida que el nombre de la categoría contenga "SOCIO" (Atrapa SOCIO y SOCIO_Y_JUGADOR)
        if (!responsable.getCategoria().name().contains("SOCIO")) {
            throw new RuntimeException("El responsable debe ser SOCIO o SOCIO Y JUGADOR.");
        }
    }
}