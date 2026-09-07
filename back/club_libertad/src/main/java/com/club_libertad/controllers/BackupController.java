package com.club_libertad.controllers;

import com.club_libertad.services.BackupService;
import com.club_libertad.services.BackupService.BackupInfo;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;

@RestController
public class BackupController {
    private final BackupService backupService;
    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @GetMapping("/backups")
    @Operation(summary = "Lista las copias de seguridad disponibles")
    public ResponseEntity<List<BackupInfo>> listBackups() {
        List<BackupInfo> list = backupService.listBackups();
        if (list.isEmpty()) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/backup")
    @Operation(summary = "Crea una nueva copia de seguridad usando pg_dump")
    public ResponseEntity<String> createBackup() {
        try {
            Optional<String> created = backupService.createBackup();
            if (created.isPresent()) {
                return ResponseEntity.ok("Backup creado: " + created.get());
            }
            return ResponseEntity.status(500).body("Error al crear backup");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error al crear backup: " + e.getMessage());
        }
    }

    @GetMapping("/backup/{file}")
    @Operation(summary = "Descarga un backup por nombre de archivo")
    public ResponseEntity<FileSystemResource> downloadBackup(@PathVariable String file) {
        Path path = Paths.get("backups").resolve(file);
        FileSystemResource resource = new FileSystemResource(path.toFile());
        if (!resource.exists()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + file)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping("/backup/{file}/restore")
    @Operation(summary = "Restaura la base de datos usando un backup existente")
    public ResponseEntity<String> restoreBackup(@PathVariable String file) {
        try {
            boolean restored = backupService.restoreBackup(file);
            if (!restored) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok("Backup restaurado: " + file);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error al restaurar backup: " + e.getMessage());
        }
    }
}
