export type RolUsuario = 'ADMIN' | 'SECRETARIO';

export interface Usuario {
  id: number;
  username: string;
  email?: string | null;
  role: RolUsuario;
  activo: boolean;
  ultimoAcceso?: string | null;
  intentosFallidos?: number;
  bloqueado?: boolean;
}