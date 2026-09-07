import api from './api';
import type { Cuota, EstadoCuota } from '../types/cuota';

const CUOTA_ENDPOINTS = {
  GET_ALL: '/cuotas',
  GET_BY_ID: (id: number) => `/cuota/${id}`,
  CREATE: '/cuota',
  CHANGE_STATE: (id: number) => `/cuota/${id}`,
  GENERAR_MES_ACTUAL: '/cuotas/generar-mes-actual',
  ACTUALIZAR_VENCIDAS: '/cuotas/actualizar-vencidas',
};

const cuotaService = {
  getAll() {
    return api.get<Cuota[]>(CUOTA_ENDPOINTS.GET_ALL).catch(error => {
      console.error('Error al obtener cuotas:', error);
      throw error;
    });
  },

  getById(id: number) {
    return api.get<Cuota>(CUOTA_ENDPOINTS.GET_BY_ID(id)).catch(error => {
      console.error(`Error al obtener cuota con ID ${id}:`, error);
      throw error;
    });
  },

  create(cuota: Omit<Cuota, 'id'>) {
    return api.post<string>(CUOTA_ENDPOINTS.CREATE, cuota).catch(error => {
      console.error('Error al crear cuota:', error);
      throw error;
    });
  },

  changeState(id: number, estado: EstadoCuota) {
    return api.patch<string>(CUOTA_ENDPOINTS.CHANGE_STATE(id), estado).catch(error => {
      console.error(`Error al actualizar cuota con ID ${id}:`, error);
      throw error;
    });
  },

  generarCuotasMesActual() {
    return api.post<string>(CUOTA_ENDPOINTS.GENERAR_MES_ACTUAL).catch(error => {
      console.error('Error al generar cuotas del mes actual:', error);
      throw error;
    });
  },

  actualizarCuotasVencidas() {
    return api.post<string>(CUOTA_ENDPOINTS.ACTUALIZAR_VENCIDAS).catch(error => {
      console.error('Error al actualizar cuotas vencidas:', error);
      throw error;
    });
  },
};

export default cuotaService;
