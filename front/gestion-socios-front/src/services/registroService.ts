import api from './api';
import type { Registro } from '../types/registro';

const registroService = {
  getAll() {
    return api.get<Registro[]>('/registros').catch(error => {
      console.error('Error al obtener registros:', error);
      throw error;
    });
  },
};

export default registroService;
