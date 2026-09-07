import api from './api';
import type { Promocion } from '../types/promocion';

const PROMOCION_ENDPOINTS = {
  GET_ALL: '/promociones',
  GET_BY_ID: (id: number) => `/promocion/${id}`,
  CREATE: '/promocion',
  UPDATE: (id: number) => `/promocion/${id}`,
  DELETE: (id: number) => `/promocion/${id}`,
};

const promocionService = {
  getAll() {
    return api.get<Promocion[]>(PROMOCION_ENDPOINTS.GET_ALL).catch(error => {
      console.error('Error al obtener promociones:', error);
      throw error;
    });
  },

  getById(id: number) {
    return api.get<Promocion>(PROMOCION_ENDPOINTS.GET_BY_ID(id)).catch(error => {
      console.error(`Error al obtener promoción con ID ${id}:`, error);
      throw error;
    });
  },

  create(promocion: Omit<Promocion, 'id'>) {
    return api.post<string>(PROMOCION_ENDPOINTS.CREATE, promocion).catch(error => {
      console.error('Error al crear promoción:', error);
      throw error;
    });
  },

  update(id: number, promocion: Partial<Promocion>) {
    return api.patch<string>(PROMOCION_ENDPOINTS.UPDATE(id), promocion).catch(error => {
      console.error(`Error al actualizar promoción con ID ${id}:`, error);
      throw error;
    });
  },

  delete(id: number) {
    return api.delete<string>(PROMOCION_ENDPOINTS.DELETE(id)).catch(error => {
      console.error(`Error al eliminar promoción con ID ${id}:`, error);
      throw error;
    });
  },
};

export default promocionService;
