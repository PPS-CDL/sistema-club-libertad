export type EstadoCuota = 'GENERADA' | 'VENCIDA' | 'PAGADA';

export interface Cuota {
  id?: number;
  personaId: number; // backend expone solo ID
  deporteId: number; // backend expone solo ID
  periodo: string;
  monto: number;
  estado: EstadoCuota;
  fechaVencimiento?: string;
  fechaGeneracion: string;
  concepto?: string;
  pagoId?: number | null;
}
