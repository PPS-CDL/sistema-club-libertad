import api from './api';

const INSCRIPCION_ENDPOINTS = {
  CREATE: '/inscripcion',
  BAJA: (idPersona: number, idDeporte: number) => `/inscripcion/${idPersona}/${idDeporte}`
};

export interface CrearInscripcionPayload {
  personaId: number;
  deporteId: number;
  fechaInscripcion: string; // formato YYYY-MM-DD
}


const inscripcionService = {
  create(payload: CrearInscripcionPayload) {
    return api.post<string>(INSCRIPCION_ENDPOINTS.CREATE, payload).catch(error => {
      console.error('Error al crear inscripción:', error);
      throw error;
    });
  },
  darBaja(personaId: number, deporteId: number){
    return api.patch<string>(INSCRIPCION_ENDPOINTS.BAJA(personaId, deporteId)).catch(error => {
      console.error('Error al dar baja la inscripción', error);
      throw error;
    })
  },
};

export default inscripcionService;
