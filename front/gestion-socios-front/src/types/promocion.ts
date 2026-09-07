export type TipoDescuento = 'PORCENTAJE' | 'MONTO_FIJO';

export interface Promocion {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipoDescuento: TipoDescuento;
  descuento: number;
  activo: boolean;
}
