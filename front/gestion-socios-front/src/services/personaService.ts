import api from './api';
import type { Persona } from '../types/persona'; // opcional, si usas TypeScript con tipos
 // opcional, si usas TypeScript con tipos

// Definimos los endpoints como constantes (buenas prácticas)
const PERSONA_ENDPOINTS = {
  GET_ALL: '/personas',
  GET_BY_ID: (id: number) => `/persona/${id}`,
  CREATE: '/persona',
  UPDATE: (id: number) => `/persona/${id}`,
  TOGGLE_ACTIVE: (id: number) => `/persona/activo/${id}`,
};

// Servicio reutilizable
const personaService = {
  getAll() {
    return api.get<Persona[]>('/personas').catch(error => {
      console.error('Error en la API:', error);
      throw error; // Re-lanza para que el catch en el componente lo maneje
    });
  },

  getById(id: number) {
    return api.get<Persona>(PERSONA_ENDPOINTS.GET_BY_ID(id));
  },

  create(persona: Omit<Persona, 'id' | 'fechaRegistro'> & { usarRegistroExistente?: boolean }) {
    return api.post<string>(PERSONA_ENDPOINTS.CREATE, persona);
  },

  update(id: number, persona: Partial<Persona>) {
    return api.patch<string>(PERSONA_ENDPOINTS.UPDATE(id), persona);
  },

  toggleActive(id: number, observacionBaja?: string) {
    const params = new URLSearchParams();
    if (observacionBaja) {
      params.append('observacionBaja', observacionBaja);
    }
    const queryString = params.toString();
    return api.patch<string>(`/persona/activo/${id}${queryString ? '?' + queryString : ''}`).catch(error => {
      console.error('Error al dar Alta/Baja a la persona:', error);
      throw error;
    });;
  },

  asociarDeporte(personaId: number, deporteId: number) {
    return api.post<string>(`/persona/${personaId}/deporte/${deporteId}`).catch(error => {
      console.error('Error al asociar deporte:', error);
      throw error;
    });
  },

  desasociarDeporte(personaId: number, deporteId: number) {
    return api.delete<string>(`/persona/${personaId}/deporte/${deporteId}`).catch(error => {
      console.error('Error al desasociar deporte:', error);
      throw error;
    });
  },

  getDeportes(personaId: number) {
    return api.get(`/persona/${personaId}/deportes`).catch(error => {
      console.error('Error al obtener deportes de la persona:', error);
      throw error;
    });
  },

  delete(id: number, observacionBaja?: string) {
    const params = new URLSearchParams();
    if (observacionBaja) {
      params.append('observacionBaja', observacionBaja);
    }
    const queryString = params.toString();
    return api.delete<string>(`/persona/${id}${queryString ? '?' + queryString : ''}`).catch(error => {
      console.error('Error al eliminar persona:', error);
      throw error;
    });
  },
};

export default personaService;