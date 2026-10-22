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

export interface PersonaEstadoPagoDTO {
  personaId: number;
  nombre: string;
  apellido: string;
  dni: string;
  estado: "PAGADA" | "PENDIENTE";
}

export interface EstadoPagosDeporteDTO {
  periodo: string; // Formato YYYY-MM
  totalInscriptos: number;
  pagaron: number;
  deben: number;
  personas: PersonaEstadoPagoDTO[];
}
