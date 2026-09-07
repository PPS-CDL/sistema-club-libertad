export interface Registro {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaRegistro: string; // ISO format
  fechaBaja?: string; // ISO format
  observacionBaja?: string;
}
