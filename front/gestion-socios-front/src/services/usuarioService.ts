import api from './api';

import { Usuario } from '../types/usuario';

const usuarioService = {
  getAll() {
    return api.get<Usuario[]>('/usuarios');
  },
  create(payload: { username: string; email: string; role: 'ADMIN' | 'SECRETARIO' }) {
    return api.post<string>('/usuario', payload);
  },
  delete(id: number) {
    return api.delete<string>(`/usuario/${id}`);
  },
  changePassword(id: number, currentPassword: string, newPassword: string) {
    return api.post<string>(`/usuario/${id}/password`, { currentPassword, newPassword });
  },
  toggleEstado(id: number) {
    return api.patch(`/usuario/estado/${id}`);
  },
};

export default usuarioService;