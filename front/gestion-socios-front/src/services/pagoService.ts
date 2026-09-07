import api from './api';

const PAGO_ENDPOINTS = {
  CREATE: '/pago',
  GET_ALL: '/pagos',
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
};

export default pagoService;
