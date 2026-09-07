export interface Deporte {
  id?: number; // opcional porque no se envía al crear
  nombre: string;
  descripcion?: string;
  cuotaMensual: number; // calculada en backend
  cuotaEntrenador: number;
  cuotaSeguro: number;
  cuotaSocial: number;
  personasIds?: number[]; // IDs de las personas asociadas
  numeroSocios?: number; // Número de socios asociados
}