export type EstadoCuota =
  | "GENERADA"
  | "VENCIDA"
  | "PAGADA"
  | "PENDIENTE"
  | "CANCELADA";

export interface Cuota {
  id?: number | string;
  idSocialReal?: number; // Guardará el ID numérico original de la tabla cuota_social
  esSocial?: boolean; // Flag para diferenciar cuotas deportivas vs sociales
  personaId: number; // backend expone solo ID
  deporteId: number | null; // las cuotas sociales independientes no tienen deporte
  periodo: string;
  monto: number;
  estado: EstadoCuota;
  fechaVencimiento?: string;
  fechaGeneracion: string;
  concepto?: string;
  pagoId?: number | null;
  cuotaEntrenador?: number;
  cuotaSeguro?: number;
  cuotaSocial?: number;
}
