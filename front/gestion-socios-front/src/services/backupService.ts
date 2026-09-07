import api from './api';

export interface BackupInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

const BACKUP_ENDPOINTS = {
  LIST: '/backups',
  CREATE: '/backup',
  DOWNLOAD: (file: string) => `/backup/${encodeURIComponent(file)}`,
  RESTORE: (file: string) => `/backup/${encodeURIComponent(file)}/restore`,
};

const backupService = {
  list() {
    return api.get<BackupInfo[]>(BACKUP_ENDPOINTS.LIST).catch(error => {
      console.error('Error al listar backups:', error);
      throw error;
    });
  },
  create() {
    return api.post<string>(BACKUP_ENDPOINTS.CREATE).catch(error => {
      console.error('Error al crear backup:', error);
      throw error;
    });
  },
  restore(file: string) {
    return api.post<string>(BACKUP_ENDPOINTS.RESTORE(file)).catch(error => {
      console.error('Error al restaurar backup:', error);
      throw error;
    });
  },
  downloadUrl(file: string) {
    return BACKUP_ENDPOINTS.DOWNLOAD(file);
  }
};

export default backupService;
