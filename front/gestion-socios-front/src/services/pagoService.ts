import api from './api';

const PAGO_ENDPOINTS = {
  CREATE: '/pago',
  GET_ALL: '/pagos',
  FILTRO: '/pagos/filtro',
  RESUMEN: '/pagos/resumen-ingresos',
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

export interface FiltroFechaParams {
  fecha?: string;      // Formato: YYYY-MM-DD
  fechaDesde?: string; // Formato: YYYY-MM-DD
  fechaHasta?: string; // Formato: YYYY-MM-DD
}

export interface Pago {
  id: number;
  socioId: number;
  fechaPago: string;
  montoTotal: number;
  cuotaEntrenador: number;
  cuotaSeguro: number;
  cuotaSocial: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO_AUTOMATICO';
  observaciones?: string;
  cuotasIds: number[];
}

export interface ResumenIngresos {
  cantidadIngresos: number;
  montoTotal: number;
  totalEntrenador: number;
  totalSeguro: number;
  totalSocial: number;
  fecha?: string;
  fechaDesde?: string;
  fechaHasta?: string;
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
  getByFechaORango(params: FiltroFechaParams) {
    const query = new URLSearchParams();
    if (params.fecha && params.fecha.trim() !== '') {
      query.append('fecha', params.fecha.trim());
    }
    if (params.fechaDesde && params.fechaDesde.trim() !== '') {
      query.append('fechaDesde', params.fechaDesde.trim());
    }
    if (params.fechaHasta && params.fechaHasta.trim() !== '') {
      query.append('fechaHasta', params.fechaHasta.trim());
    }
    const url = query.toString() ? `${PAGO_ENDPOINTS.FILTRO}?${query.toString()}` : PAGO_ENDPOINTS.FILTRO;
    return api.get<Pago[]>(url).catch(error => {
      console.warn('Aviso al obtener pagos filtrados del backend:', error);
      throw error;
    });
  },
  getResumenIngresos(params: FiltroFechaParams) {
    const query = new URLSearchParams();
    if (params.fecha && params.fecha.trim() !== '') {
      query.append('fecha', params.fecha.trim());
    }
    if (params.fechaDesde && params.fechaDesde.trim() !== '') {
      query.append('fechaDesde', params.fechaDesde.trim());
    }
    if (params.fechaHasta && params.fechaHasta.trim() !== '') {
      query.append('fechaHasta', params.fechaHasta.trim());
    }
    const url = query.toString() ? `${PAGO_ENDPOINTS.RESUMEN}?${query.toString()}` : PAGO_ENDPOINTS.RESUMEN;
    return api.get<ResumenIngresos>(url).catch(error => {
      console.warn('Aviso al obtener resumen de ingresos del backend:', error);
      throw error;
    });
  },
};

export default pagoService;