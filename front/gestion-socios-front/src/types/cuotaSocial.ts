export interface CuotaSocial {
  id: number;
  socio: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
  };
  tipoCuota: "INDIVIDUAL" | "FAMILIAR";
  periodo: string; // Ej: "2026-10"
  monto: number;
  estado: "PENDIENTE" | "PAGADA" | "VENCIDA" | "CANCELADA";
  fechaGeneracion: string;
  fechaVencimiento: string;
  concepto: string;
  pagoId?: number | null;
}
