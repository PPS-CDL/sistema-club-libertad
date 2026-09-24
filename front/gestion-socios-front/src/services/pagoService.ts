import api from './api';

const PAGO_ENDPOINTS = {
  CREATE: '/pago',
  GET_ALL: '/pagos',
  GET_INGRESOS_POR_SOCIO: '/pagos/ingresos-por-socio', 
};

export interface CrearPagoPayload {
  socioId: number;
  fechaPago: string; // YYYY-MM-DD
  montoOriginal: number;
  montoDescuento: number;
  montoTotal: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO_AUTOMATICO';
  observaciones?: string;
  cuotaIds: number[];
}

export interface IngresoPorSocioDTO {
  socioId: number;
  nombre: string;
  apellido: string;
  dni: string;
  totalPagado: number;
  cantidadPagos: number;
  ultimoPago: string | null;
}

const pagoService = {
  getAll() {
    return api.get(PAGO_ENDPOINTS.GET_ALL).catch(error => {
      console.error('Error al obtener pagos:', error);
      throw error;
    });
  },
  create(payload: CrearPagoPayload) {
    return api.post<string>(PAGO_ENDPOINTS.CREATE, payload).catch(error => {
      console.error('Error al crear pago:', error);
      throw error;
    });
  },

    getIngresosPorSocio() {
    return api.get<IngresoPorSocioDTO[]>(PAGO_ENDPOINTS.GET_INGRESOS_POR_SOCIO).catch(error => {
      console.error('Error al obtener ingresos por socio:', error);
      throw error;
    });
  },
};

export default pagoService;
