export type CategoriaBackend = 'SOCIO' | 'JUGADOR' | 'SOCIOYJUGADOR';

export interface Persona {
  id: string;
  apellido: string;
  nombre: string;
  dni: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  categoria: CategoriaBackend;
  edad?: number;
  fechaNacimiento: string; // ISO
  socioResponsable?: Persona; // "Nombre Apellido (DNI: XXXXXXXX)"
  socioResponsableId?: number;
  socioResponsableDni?: string;
  deportes?: string[]; // reservado para futuro
  deportesIds?: number[]; // IDs de los deportes asociados
  activo?: boolean;
  fechaRegistro: string; // ISO
  promocionId?: number;
}