import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Download, FileText, DollarSign, TrendingUp, AlertCircle, ChevronDown, ChevronRight, Calendar, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import cuotaService from '../services/cuotaService';
import pagoService, { IngresoPorSocioDTO } from '../services/pagoService';
import pagoService, { type FiltroFechaParams, type ResumenIngresos } from '../services/pagoService';
import personaService from '../services/personaService';
import deporteService from '../services/deporteService';
import type { Cuota } from '../types/cuota';
import type { Persona } from '../types/persona';
import type { Deporte } from '../types/deporte';
import { Checkbox } from './ui/checkbox';

interface Pago {
  id: string;
  socio: string;
  socioDNI: string;
  monto: number;
  fecha: string;
  mes: string;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO_AUTOMATICO';
  estado: 'pagado' | 'pendiente' | 'vencido';
  conceptos: {
    concepto: string;
    monto: number;
  }[];
}

interface PagosModuleProps {
  userRole: 'admin' | 'secretario';
}

export function PagosModule({ userRole }: PagosModuleProps) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [ingresosPorSocio, setIngresosPorSocio] = useState<IngresoPorSocioDTO[]>([]);
  const [searchIngresosPorSocio, setSearchIngresosPorSocio] = useState<string>('');
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [pagosServidor, setPagosServidor] = useState<any[]>([]);
  const [searchCuota, setSearchCuota] = useState<string>('');
  const [filterDeportePago, setFilterDeportePago] = useState<string>('all');
  const [filterMesPago, setFilterMesPago] = useState<string>('all');
  const [filterSocioPago, setFilterSocioPago] = useState<string>('all');
  const [expandedPagos, setExpandedPagos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('todos');

  const getFechaHoy = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [modoFiltroFecha, setModoFiltroFecha] = useState<'dia' | 'rango'>('dia');
  const [fechaFiltro, setFechaFiltro] = useState<string>(getFechaHoy());
  const [fechaDesdeFiltro, setFechaDesdeFiltro] = useState<string>('');
  const [fechaHastaFiltro, setFechaHastaFiltro] = useState<string>('');
  const [resumenIngresos, setResumenIngresos] = useState<ResumenIngresos | null>(null);
  const [pagosFiltrados, setPagosFiltrados] = useState<any[]>([]);
  const [cargandoReporte, setCargandoReporte] = useState<boolean>(false);

  const getMesAno = (periodo: string) => {
    const [year, month] = periodo.split('-');
    if (!year || !month) return periodo;
    const mesNum = parseInt(month, 10);
    const meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${meses[mesNum] || 'mes'} de ${year}`;
  };

  const cargarCuotas = useCallback(async () => {
    try {
      setLoading(true);

      await cuotaService.actualizarCuotasVencidas();
      await cuotaService.generarCuotasMesActual();

      // Luego cargar todas las cuotas, personas, deportes e ingresos por socio en paralelo
      const [cuotasRes, personasRes, deportesRes, pagosRes, ingresosPorSocioRes] = await Promise.all([
          cuotaService.getAll(),
          personaService.getAll(),
          deporteService.getAll(),
          pagoService.getAll(),
          pagoService.getIngresosPorSocio(),
        ]);
      const [cuotasRes, personasRes, deportesRes, pagosRes] = await Promise.all([
        cuotaService.getAll(),
        personaService.getAll(),
        deporteService.getAll(),
        pagoService.getAll(),
      ]);
      const cuotasData = Array.isArray(cuotasRes.data) ? cuotasRes.data : [];
      const personasData = Array.isArray(personasRes.data) ? personasRes.data : [];
      const deportesData = Array.isArray(deportesRes.data) ? deportesRes.data : [];
      setCuotas(cuotasData);
      setPersonas(personasData);
      setDeportes(deportesData);
      setPagosServidor(Array.isArray(pagosRes.data) ? pagosRes.data : []);
      setIngresosPorSocio(Array.isArray(ingresosPorSocioRes.data) ? ingresosPorSocioRes.data : []);

      const personaMap = new Map<number, Persona>(personasData.map(p => [Number(p.id), p] as const));
      const deporteMap = new Map<number, Deporte>(deportesData.map(d => [Number(d.id), d] as const));

      const pagosTransformados = cuotasData.map((cuota, idx) => {
        const p = personaMap.get(Number(cuota.personaId));
        const d = deporteMap.get(Number(cuota.deporteId));
        return {
          id: (cuota.id || idx).toString(),
          socio: p ? `${p.nombre} ${p.apellido}` : `Persona ${cuota.personaId}`,
          socioDNI: p?.dni || '',
          monto: cuota.monto,
          fecha: cuota.estado === 'PAGADA' ? cuota.fechaGeneracion : '',
          mes: getMesAno(cuota.periodo),
          metodoPago: 'TRANSFERENCIA' as const,
          estado: cuota.estado === 'PAGADA' ? 'pagado' : cuota.estado === 'VENCIDA' ? 'vencido' : 'pendiente',
          conceptos: [
            {
              concepto: cuota.concepto || `${d?.nombre || 'Cuota'}`,
              monto: cuota.monto,
            },
          ],
        } as Pago;
      });

      setPagos(pagosTransformados);
    } catch (error) {
      console.error('Error al cargar cuotas:', error);
      toast.error('Error al cargar las cuotas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCuotas();
  }, [cargarCuotas]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState('');
  const [selectedCuotas, setSelectedCuotas] = useState<number[]>([]);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO_AUTOMATICO'>('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');

  const handleRegistrarPago = async () => {
    if (!selectedSocio || selectedCuotas.length === 0) {
      toast.error('Selecciona un socio y al menos una cuota');
      return;
    }

    const socio = personas.find(s => String(s.id) === selectedSocio);
    const cuotasSeleccionadas = cuotas.filter(c => selectedCuotas.includes(Number(c.id)));
    const montoOriginal = cuotasSeleccionadas.reduce((sum, c) => sum + (c.monto || 0), 0);

    if (montoOriginal <= 0) {
      toast.error('El monto total debe ser mayor a 0');
      return;
    }

    const montoDescuento = 0;
    const totalCalculado = montoOriginal;

    const fechaPago = new Date();
    const yyyy = fechaPago.getFullYear();
    const mm = String(fechaPago.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaPago.getDate()).padStart(2, '0');
    const fechaPagoStr = `${yyyy}-${mm}-${dd}`;

    try {
      await pagoService.create({
        socioId: Number(selectedSocio),
        fechaPago: fechaPagoStr,
        montoOriginal,
        montoDescuento,
        montoTotal: totalCalculado,
        metodoPago,
        observaciones: observaciones.trim() || undefined,
        cuotaIds: selectedCuotas,
      });

      toast.success('Pago registrado correctamente');
      setIsDialogOpen(false);
      await cargarCuotas();
      resetForm();
    } catch (error) {
      toast.error('Error al registrar el pago');
      console.error('Error al registrar pago:', error);
    }
  };

  const resetForm = () => {
    setSelectedSocio('');
    setSelectedCuotas([]);
    setMetodoPago('EFECTIVO');
    setObservaciones('');
  };

  const generarArchivoRedLink = () => {
    const pagosPendientes = pagos.filter(p => p.estado === 'pendiente' && p.metodoPago === 'DEBITO_AUTOMATICO');
    
    if (pagosPendientes.length === 0) {
      toast.error('No hay pagos pendientes para débito automático');
      return;
    }

    const contenido = pagosPendientes.map(p => 
      `${p.socioDNI}|${p.socio}|${p.monto}|${p.mes}`
    ).join('\n');
    
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redlink_debitos_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    toast.success('Archivo de Red Link generado correctamente');
  };

  const formatearFechaDisplay = (fechaStr?: string) => {
    if (!fechaStr) return '—';
    const f = fechaStr.split('T')[0];
    const parts = f.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return f;
  };

  const ejecutarFiltroLocal = useCallback(() => {
    const coincide = (fechaStr?: string) => {
      if (!fechaStr) return false;
      const f = fechaStr.split('T')[0].trim();
      if (modoFiltroFecha === 'dia') {
        return f === fechaFiltro;
      }
      if (fechaDesdeFiltro && fechaHastaFiltro) {
        return f >= fechaDesdeFiltro && f <= fechaHastaFiltro;
      }
      if (fechaDesdeFiltro) return f >= fechaDesdeFiltro;
      if (fechaHastaFiltro) return f <= fechaHastaFiltro;
      return true;
    };

    if (Array.isArray(pagosServidor) && pagosServidor.length > 0) {
      const filtrados = pagosServidor.filter(p => coincide(p.fechaPago));
      const totalRecaudado = filtrados.reduce((sum, p) => sum + (Number(p.montoTotal) || 0), 0);
      const totalEntrenador = filtrados.reduce((sum, p) => sum + (Number(p.cuotaEntrenador) || 0), 0);
      const totalSeguro = filtrados.reduce((sum, p) => sum + (Number(p.cuotaSeguro) || 0), 0);
      const totalSocial = filtrados.reduce((sum, p) => sum + (Number(p.cuotaSocial) || 0), 0);

      setResumenIngresos({
        cantidadIngresos: filtrados.length,
        montoTotal: totalRecaudado,
        totalEntrenador,
        totalSeguro,
        totalSocial,
      });
      setPagosFiltrados(filtrados);
      toast.success(`Se encontraron ${filtrados.length} ingresos`);
    } else {
      const cuotasPagadas = cuotas.filter(c => c.estado === 'PAGADA' && coincide(c.fechaGeneracion));
      const total = cuotasPagadas.reduce((sum, c) => sum + (Number(c.monto) || 0), 0);
      const totalEntrenador = cuotasPagadas.reduce((sum, c) => sum + (Number(c.cuotaEntrenador) || 0), 0);
      const totalSeguro = cuotasPagadas.reduce((sum, c) => sum + (Number(c.cuotaSeguro) || 0), 0);
      const totalSocial = cuotasPagadas.reduce((sum, c) => sum + (Number(c.cuotaSocial) || 0), 0);

      const adaptados = cuotasPagadas.map((c, idx) => ({
        id: c.pagoId || c.id || idx,
        socioId: c.personaId,
        fechaPago: c.fechaGeneracion,
        montoTotal: c.monto,
        cuotaEntrenador: c.cuotaEntrenador || 0,
        cuotaSeguro: c.cuotaSeguro || 0,
        cuotaSocial: c.cuotaSocial || 0,
        metodoPago: 'TRANSFERENCIA',
        observaciones: c.concepto || 'Cobro de cuota',
      }));

      setResumenIngresos({
        cantidadIngresos: adaptados.length,
        montoTotal: total,
        totalEntrenador,
        totalSeguro,
        totalSocial,
      });
      setPagosFiltrados(adaptados);
      toast.success(`Se encontraron ${adaptados.length} ingresos`);
    }
  }, [modoFiltroFecha, fechaFiltro, fechaDesdeFiltro, fechaHastaFiltro, pagosServidor, cuotas]);

  const consultarIngresosPorFecha = useCallback(async () => {
    setCargandoReporte(true);
    const params: FiltroFechaParams = {};
    if (modoFiltroFecha === 'dia') {
      if (!fechaFiltro) {
        toast.error('Selecciona una fecha');
        setCargandoReporte(false);
        return;
      }
      params.fecha = fechaFiltro;
    } else {
      if (!fechaDesdeFiltro && !fechaHastaFiltro) {
        toast.error('Ingresa al menos una fecha desde o hasta');
        setCargandoReporte(false);
        return;
      }
      if (fechaDesdeFiltro) params.fechaDesde = fechaDesdeFiltro;
      if (fechaHastaFiltro) params.fechaHasta = fechaHastaFiltro;
    }

    try {
      const [resumenRes, listadoRes] = await Promise.all([
        pagoService.getResumenIngresos(params),
        pagoService.getByFechaORango(params),
      ]);

      if (resumenRes?.data && listadoRes?.data) {
        const lista = Array.isArray(listadoRes.data) ? listadoRes.data : [];
        setResumenIngresos(resumenRes.data);
        setPagosFiltrados(lista);
        toast.success(`Se encontraron ${resumenRes.data.cantidadIngresos ?? lista.length} ingresos`);
      } else {
        ejecutarFiltroLocal();
      }
    } catch (error) {
      ejecutarFiltroLocal();
    } finally {
      setCargandoReporte(false);
    }
  }, [modoFiltroFecha, fechaFiltro, fechaDesdeFiltro, fechaHastaFiltro, ejecutarFiltroLocal]);

  const generarReporte = (tipo: 'ingresos' | 'deudas') => {
    if (tipo === 'ingresos') {
      setActiveTab('ingresos-fecha');
      consultarIngresosPorFecha();
    } else {
      const deudas = pagos.filter(p => p.estado === 'pendiente' || p.estado === 'vencido');
      const total = deudas.reduce((sum, p) => sum + p.monto, 0);
      toast.success(`Reporte de deudas: $${total.toLocaleString()}`);
    }
  };

  const hoy = new Date().toISOString().split('T')[0];
  const estadisticas = {
    totalIngresos: pagos.filter(p => p.estado === 'pagado').reduce((sum, p) => sum + p.monto, 0),
    ingresosDia: pagos.filter(p => p.estado === 'pagado' && p.fecha && p.fecha.startsWith(hoy)).reduce((sum, p) => sum + p.monto, 0),
    totalPendientes: pagos.filter(p => p.estado === 'pendiente').reduce((sum, p) => sum + p.monto, 0),
    totalVencidos: pagos.filter(p => p.estado === 'vencido').reduce((sum, p) => sum + p.monto, 0),
  };

  if (loading) return <div>Cargando cuotas...</div>;

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pagado: 'default',
      pendiente: 'secondary',
      vencido: 'destructive',
    };
    return variants[estado as keyof typeof variants] || 'default';
  };

  const getMetodoPagoLabel = (metodo: string) => {
    const labels = {
      EFECTIVO: 'Efectivo',
      TRANSFERENCIA: 'Transferencia',
      DEBITO_AUTOMATICO: 'Débito Automático',
    };
    return labels[metodo as keyof typeof labels] || metodo;
  };

  const togglePagoExpanded = (pagoId: string) => {
    setExpandedPagos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pagoId)) {
        newSet.delete(pagoId);
      } else {
        newSet.add(pagoId);
      }
      return newSet;
    });
  };

    const ingresosPorSocioFiltrados = ingresosPorSocio.filter((item) => {
    const search = searchIngresosPorSocio.toLowerCase().trim();
    if (!search) return true;
    const nombreCompleto = `${item.nombre} ${item.apellido}`.toLowerCase();
    return (
      nombreCompleto.includes(search) ||
      item.dni.toLowerCase().includes(search) ||
      item.apellido.toLowerCase().includes(search) ||
      item.nombre.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Ingresos del Mes
            </CardDescription>
            <CardTitle className="text-green-600">
              ${estadisticas.totalIngresos.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Ingresos del Día
            </CardDescription>
            <CardTitle className="text-blue-600">
              ${estadisticas.ingresosDia.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-600" />
              Pagos Pendientes
            </CardDescription>
            <CardTitle className="text-yellow-600">
              ${estadisticas.totalPendientes.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Pagos Vencidos
            </CardDescription>
            <CardTitle className="text-red-600">
              ${estadisticas.totalVencidos.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Cuotas</CardTitle>
              <CardDescription>Registro y manejo de cuotas</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={generarArchivoRedLink}>
                <Download className="w-4 h-4 mr-2" />
                Archivo Red Link
              </Button>
              <Button variant="outline" onClick={() => generarReporte('ingresos')}>
                <FileText className="w-4 h-4 mr-2" />
                Reporte Ingresos
              </Button>
              <Button variant="outline" onClick={() => generarReporte('deudas')}>
                <FileText className="w-4 h-4 mr-2" />
                Reporte Deudas
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Pago
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                    <DialogDescription>
                      Selecciona el socio y las cuotas que deseas marcar como pagadas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Socio *</Label>
                        <Select value={selectedSocio} onValueChange={(v) => { setSelectedSocio(v); setSelectedCuotas([]); }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un socio" />
                          </SelectTrigger>
                          <SelectContent>
                            {personas.map((socio) => (
                              <SelectItem key={socio.id} value={String(socio.id)}>
                                {socio.nombre} {socio.apellido} (DNI: {socio.dni})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Método de Pago *</Label>
                        <Select value={metodoPago} onValueChange={(v: any) => setMetodoPago(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                            <SelectItem value="DEBITO_AUTOMATICO">Débito Automático</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Input
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cuotas a pagar *</Label>
                      <div className="border rounded-lg divide-y max-h-[260px] overflow-y-auto">
                        {cuotas
                          .filter(c => selectedSocio && Number(c.personaId) === Number(selectedSocio) && c.estado !== 'PAGADA')
                          .map(cuota => {
                            const deporte = deportes.find(d => Number(d.id) === Number(cuota.deporteId));
                            const checked = selectedCuotas.includes(Number(cuota.id));
                            return (
                              <div key={cuota.id} className="flex items-center gap-3 p-3">
                                <Checkbox
                                  id={`cuota-${cuota.id}`}
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    if (val) {
                                      setSelectedCuotas(prev => [...prev, Number(cuota.id)]);
                                    } else {
                                      setSelectedCuotas(prev => prev.filter(id => id !== Number(cuota.id)));
                                    }
                                  }}
                                />
                                <label htmlFor={`cuota-${cuota.id}`} className="flex-1 cursor-pointer">
                                  <div className="font-medium flex items-center gap-2">
                                    {deporte?.nombre || 'Cuota'}
                                    <Badge variant="outline" className="text-xs">{cuota.estado}</Badge>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Periodo: {getMesAno(cuota.periodo)}
                                  </div>
                                </label>
                                <div className="text-sm font-semibold">${(cuota.monto || 0).toLocaleString()}</div>
                              </div>
                            );
                          })}
                        {selectedSocio && cuotas.filter(c => Number(c.personaId) === Number(selectedSocio) && c.estado !== 'PAGADA').length === 0 && (
                          <div className="p-3 text-sm text-gray-500">No hay cuotas pendientes para este socio</div>
                        )}
                        {!selectedSocio && (
                          <div className="p-3 text-sm text-gray-500">Selecciona un socio para ver sus cuotas</div>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Total seleccionado:</span>
                        <span className="font-semibold">
                          ${cuotas
                            .filter(c => selectedCuotas.includes(Number(c.id)))
                            .reduce((sum, c) => sum + (c.monto || 0), 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleRegistrarPago}>
                      Registrar Pago
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="todos">Cuotas</TabsTrigger>
              <TabsTrigger value="pagados">Pagadas</TabsTrigger>
              <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              <TabsTrigger value="vencidos">Vencidas</TabsTrigger>
              <TabsTrigger value="pagos">Pagos</TabsTrigger>
              <TabsTrigger value="ingresosPorSocio">Ingresos por socio</TabsTrigger>
              <TabsTrigger value="ingresos-fecha" className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Ingresos por Fecha
              </TabsTrigger>
            </TabsList>

            {['todos', 'pagados', 'pendientes', 'vencidos'].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Buscar por socio, DNI, deporte o estado..."
                    value={searchCuota}
                    onChange={(e) => setSearchCuota(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Socio</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Mes</TableHead>
                        <TableHead>Conceptos</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Fecha del Pago</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagos
                        .filter(p => {
                          if (tab === 'todos') return true;
                          if (tab === 'pagados') return p.estado === 'pagado';
                          if (tab === 'pendientes') return p.estado === 'pendiente';
                          if (tab === 'vencidos') return p.estado === 'vencido';
                          return true;
                        })
                        .filter(p => {
                          const search = searchCuota.toLowerCase().trim();
                          if (!search) return true;
                          return (
                            p.socio.toLowerCase().includes(search) ||
                            p.socioDNI.toLowerCase().includes(search) ||
                            p.estado.toLowerCase().includes(search) ||
                            p.conceptos.some(c => c.concepto.toLowerCase().includes(search))
                          );
                        })
                        .map((pago) => (
                          <TableRow key={pago.id}>
                            <TableCell>{pago.socio}</TableCell>
                            <TableCell>{pago.socioDNI}</TableCell>
                            <TableCell>{pago.mes}</TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                {pago.conceptos.map((c, idx) => (
                                  <div key={idx}>
                                    <span className="text-gray-600">{c.concepto}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span>${pago.monto.toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getMetodoPagoLabel(pago.metodoPago)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {pago.fecha ? formatearFechaDisplay(pago.fecha) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getEstadoBadge(pago.estado) as any}>
                                {pago.estado}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}

            {/* Lista alterna de Pagos */}
            <TabsContent value="pagos">
              <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor="filterDeportePago" className="whitespace-nowrap">Filtrar por deporte:</Label>
                  <Select value={filterDeportePago} onValueChange={setFilterDeportePago}>
                    <SelectTrigger id="filterDeportePago" className="w-64">
                      <SelectValue placeholder="Todos los deportes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los deportes</SelectItem>
                      {deportes.map(deporte => (
                        <SelectItem key={deporte.id} value={String(deporte.id)}>
                          {deporte.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Label htmlFor="filterMesPago" className="whitespace-nowrap">Filtrar por mes:</Label>
                  <Select value={filterMesPago} onValueChange={setFilterMesPago}>
                    <SelectTrigger id="filterMesPago" className="w-48">
                      <SelectValue placeholder="Todos los meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los meses</SelectItem>
                      <SelectItem value="1">Enero</SelectItem>
                      <SelectItem value="2">Febrero</SelectItem>
                      <SelectItem value="3">Marzo</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Mayo</SelectItem>
                      <SelectItem value="6">Junio</SelectItem>
                      <SelectItem value="7">Julio</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Septiembre</SelectItem>
                      <SelectItem value="10">Octubre</SelectItem>
                      <SelectItem value="11">Noviembre</SelectItem>
                      <SelectItem value="12">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Label htmlFor="filterSocioPago" className="whitespace-nowrap">Filtrar por socio:</Label>
                  <Input
                    id="filterSocioPago"
                    value={filterSocioPago === 'all' ? '' : filterSocioPago}
                    onChange={(e) => setFilterSocioPago(e.target.value)}
                    placeholder="Buscar por nombre, apellido o DNI..."
                    className="w-64"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nombre y Apellido</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Cuotas Pagadas</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead>Fecha de Pago</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(pagosServidor) && pagosServidor.length > 0 ? (
                      pagosServidor
                        .filter((pago: any) => {
                          const matchesDeporte = (() => {
                            if (filterDeportePago === 'all') return true;
                            const cuotasDePago = cuotas.filter(c => Number(c.pagoId) === Number(pago.id));
                            return cuotasDePago.some(c => Number(c.deporteId) === Number(filterDeportePago));
                          })();

                          const matchesMes = (() => {
                            if (filterMesPago === 'all') return true;
                            if (!pago.fechaPago) return false;
                            const mesPago = new Date(pago.fechaPago).getMonth() + 1;
                            return mesPago === Number(filterMesPago);
                          })();

                          const matchesSocio = (() => {
                            if (filterSocioPago === 'all' || !filterSocioPago) return true;
                            const q = String(filterSocioPago).toLowerCase().trim();
                            const socio = personas.find(p => Number(p.id) === Number(pago.socioId));
                            if (!socio) return false;
                            const nombreCompleto = `${socio.nombre} ${socio.apellido}`.toLowerCase();
                            const dni = String(socio.dni || '').toLowerCase();
                            return nombreCompleto.includes(q) || dni.includes(q);
                          })();

                          return matchesDeporte && matchesMes && matchesSocio;
                        })
                        .map((pago: any) => {
                          const socio = personas.find(p => Number(p.id) === Number(pago.socioId));
                          const cuotasDePago = cuotas.filter(c => Number(c.pagoId) === Number(pago.id));
                          const deportesNombres = cuotasDePago
                            .map(c => {
                              const deporte = deportes.find(d => Number(d.id) === Number(c.deporteId));
                              return deporte?.nombre || 'Deporte desconocido';
                            })
                            .join(', ');
                          const isExpanded = expandedPagos.has(String(pago.id));
                          const desglosePorDeporte = cuotasDePago.reduce((acc, cuota) => {
                            const deporteId = Number(cuota.deporteId);
                            if (!acc[deporteId]) {
                              const deporte = deportes.find(d => Number(d.id) === deporteId);
                              acc[deporteId] = {
                                nombre: deporte?.nombre || 'Deporte desconocido',
                                entrenador: 0,
                                seguro: 0,
                                social: 0,
                              };
                            }
                            acc[deporteId].entrenador += cuota.cuotaEntrenador || 0;
                            acc[deporteId].seguro += cuota.cuotaSeguro || 0;
                            acc[deporteId].social += cuota.cuotaSocial || 0;
                            return acc;
                          }, {} as Record<number, { nombre: string; entrenador: number; seguro: number; social: number }>);
                          const desgloseArray = Object.values(desglosePorDeporte);
                          const hasConceptos = desgloseArray.some(d => d.entrenador || d.seguro || d.social);

                          return (
                            <>
                              <TableRow key={pago.id} className="cursor-pointer hover:bg-gray-50" onClick={() => togglePagoExpanded(String(pago.id))}>
                                <TableCell>
                                  {hasConceptos ? (
                                    isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                  ) : null}
                        const socio = personas.find(p => Number(p.id) === Number(pago.socioId));
                        const cuotasDePago = cuotas.filter(c => Number(c.pagoId) === Number(pago.id));
                        const deportesNombres = cuotasDePago
                          .map(c => {
                            const deporte = deportes.find(d => Number(d.id) === Number(c.deporteId));
                            return deporte?.nombre || 'Deporte desconocido';
                          })
                          .join(', ');
                        const isExpanded = expandedPagos.has(String(pago.id));
                        const desglosePorDeporte = cuotasDePago.reduce((acc, cuota) => {
                          const deporteId = Number(cuota.deporteId);
                          if (!acc[deporteId]) {
                            const deporte = deportes.find(d => Number(d.id) === deporteId);
                            acc[deporteId] = {
                              nombre: deporte?.nombre || 'Deporte desconocido',
                              entrenador: 0,
                              seguro: 0,
                              social: 0,
                            };
                          }
                          acc[deporteId].entrenador += cuota.cuotaEntrenador || 0;
                          acc[deporteId].seguro += cuota.cuotaSeguro || 0;
                          acc[deporteId].social += cuota.cuotaSocial || 0;
                          return acc;
                        }, {} as Record<number, { nombre: string; entrenador: number; seguro: number; social: number }>);
                        const desgloseArray = Object.values(desglosePorDeporte);
                        const hasConceptos = desgloseArray.some(d => d.entrenador || d.seguro || d.social);
                        
                        return (
                          <>
                            <TableRow key={pago.id} className="cursor-pointer hover:bg-gray-50" onClick={() => togglePagoExpanded(String(pago.id))}>
                              <TableCell>
                                {hasConceptos ? (
                                  isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                ) : null}
                              </TableCell>
                              <TableCell>{socio ? `${socio.nombre} ${socio.apellido}` : '—'}</TableCell>
                              <TableCell>{socio?.dni || '—'}</TableCell>
                              <TableCell>{deportesNombres || '—'}</TableCell>
                              <TableCell>${(pago.montoTotal || 0).toLocaleString()}</TableCell>
                              <TableCell>{formatearFechaDisplay(pago.fechaPago)}</TableCell>
                              <TableCell>{pago.observaciones || '—'}</TableCell>
                            </TableRow>
                            {isExpanded && hasConceptos && (
                              <TableRow key={`${pago.id}-desglose`} className="bg-gray-50">
                                <TableCell colSpan={7} className="py-3 px-6">
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-700">Desglose de conceptos:</p>
                                    <div className="space-y-3">
                                      {desgloseArray.map((d, idx) => (
                                        <div key={`${pago.id}-dep-${idx}`} className="rounded border bg-white p-3">
                                          <div className="font-medium text-gray-700 mb-2">{d.nombre}</div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            {d.entrenador > 0 && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-600">Entrenador:</span>
                                                <span className="font-semibold">${d.entrenador.toLocaleString()}</span>
                                              </div>
                                            )}
                                            {d.seguro > 0 && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-600">Seguro:</span>
                                                <span className="font-semibold">${d.seguro.toLocaleString()}</span>
                                              </div>
                                            )}
                                            {d.social > 0 && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-600">Social:</span>
                                                <span className="font-semibold">${d.social.toLocaleString()}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {pago.montoTotal !== (pago.cuotaEntrenador + pago.cuotaSeguro + pago.cuotaSocial) && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        * El monto total puede diferir de la suma por promociones aplicadas
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{socio ? `${socio.nombre} ${socio.apellido}` : '—'}</TableCell>
                                <TableCell>{socio?.dni || '—'}</TableCell>
                                <TableCell>{deportesNombres || '—'}</TableCell>
                                <TableCell>${(pago.montoTotal || 0).toLocaleString()}</TableCell>
                                <TableCell>{pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-ES') : '—'}</TableCell>
                                <TableCell>{pago.observaciones || '—'}</TableCell>
                              </TableRow>
                              {isExpanded && hasConceptos && (
                                <TableRow key={`${pago.id}-desglose`} className="bg-gray-50">
                                  <TableCell colSpan={7} className="py-3 px-6">
                                    <div className="space-y-2">
                                      <p className="text-sm font-semibold text-gray-700">Desglose de conceptos:</p>
                                      <div className="space-y-3">
                                        {desgloseArray.map((d, idx) => (
                                          <div key={`${pago.id}-dep-${idx}`} className="rounded border bg-white p-3">
                                            <div className="font-medium text-gray-700 mb-2">{d.nombre}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                              {d.entrenador > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">Entrenador:</span>
                                                  <span className="font-semibold">${d.entrenador.toLocaleString()}</span>
                                                </div>
                                              )}
                                              {d.seguro > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">Seguro:</span>
                                                  <span className="font-semibold">${d.seguro.toLocaleString()}</span>
                                                </div>
                                              )}
                                              {d.social > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">Social:</span>
                                                  <span className="font-semibold">${d.social.toLocaleString()}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {pago.montoTotal !== (pago.cuotaEntrenador + pago.cuotaSeguro + pago.cuotaSocial) && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          * El monto total puede diferir de la suma por promociones aplicadas
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500">No hay pagos registrados</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="ingresosPorSocio">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ingresos por socio</CardTitle>
                      <CardDescription>Resumen de pagos agrupados por socio</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      type="text"
                      placeholder="Buscar por nombre, apellido o DNI..."
                      value={searchIngresosPorSocio}
                      onChange={(e) => setSearchIngresosPorSocio(e.target.value)}
                      className="max-w-md"
                    />
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Socio</TableHead>
                          <TableHead>DNI</TableHead>
                          <TableHead>Total pagado</TableHead>
                          <TableHead>Cantidad de pagos</TableHead>
                          <TableHead>Último pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingresosPorSocioFiltrados.length > 0 ? (
                          ingresosPorSocioFiltrados.map((item) => (
                            <TableRow key={item.socioId}>
                              <TableCell>
                                {item.nombre} {item.apellido}
                              </TableCell>
                              <TableCell>{item.dni}</TableCell>
                              <TableCell>
                                ${Number(item.totalPagado || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>{item.cantidadPagos}</TableCell>
                              <TableCell>
                                {item.ultimoPago
                                  ? new Date(item.ultimoPago).toLocaleDateString('es-ES')
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500">
                              No se encontraron resultados
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            {/* Listado y Reporte por Fecha o Rango */}
            <TabsContent value="ingresos-fecha" className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">Consulta de Ingresos por Fecha o Período</h3>
                    <p className="text-sm text-gray-500">Consulta cuántos ingresos hubo y el total recaudado en una fecha fija o rango.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={modoFiltroFecha === 'dia' ? 'default' : 'outline'}
                      onClick={() => setModoFiltroFecha('dia')}
                    >
                      Día puntual
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={modoFiltroFecha === 'rango' ? 'default' : 'outline'}
                      onClick={() => setModoFiltroFecha('rango')}
                    >
                      Período / Rango
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3 pt-2">
                  {modoFiltroFecha === 'dia' ? (
                    <div className="space-y-1">
                      <Label htmlFor="filtro-fecha-dia">Fecha del ingreso</Label>
                      <Input
                        id="filtro-fecha-dia"
                        type="date"
                        value={fechaFiltro}
                        onChange={(e) => setFechaFiltro(e.target.value)}
                        className="w-48"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="filtro-fecha-desde">Fecha Desde</Label>
                        <Input
                          id="filtro-fecha-desde"
                          type="date"
                          value={fechaDesdeFiltro}
                          onChange={(e) => setFechaDesdeFiltro(e.target.value)}
                          className="w-44"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="filtro-fecha-hasta">Fecha Hasta</Label>
                        <Input
                          id="filtro-fecha-hasta"
                          type="date"
                          value={fechaHastaFiltro}
                          onChange={(e) => setFechaHastaFiltro(e.target.value)}
                          className="w-44"
                        />
                      </div>
                    </>
                  )}

                  <Button onClick={consultarIngresosPorFecha} disabled={cargandoReporte} className="gap-2">
                    <Search className="w-4 h-4" />
                    {cargandoReporte ? 'Consultando...' : 'Buscar Ingresos'}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setModoFiltroFecha('dia');
                      setFechaFiltro(getFechaHoy());
                      setFechaDesdeFiltro('');
                      setFechaHastaFiltro('');
                      setResumenIngresos(null);
                      setPagosFiltrados([]);
                    }}
                  >
                    Limpiar / Hoy
                  </Button>
                </div>
              </div>

              {resumenIngresos && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardDescription>Cantidad de Ingresos</CardDescription>
                      <CardTitle className="text-2xl font-bold text-blue-700">
                        {resumenIngresos.cantidadIngresos} {resumenIngresos.cantidadIngresos === 1 ? 'cobro' : 'cobros'}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardDescription>Monto Total Recaudado</CardDescription>
                      <CardTitle className="text-2xl font-bold text-green-700">
                        ${(resumenIngresos.montoTotal || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Cuota Social</CardDescription>
                      <CardTitle className="text-xl font-semibold">
                        ${(resumenIngresos.totalSocial || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Cuota Entrenador</CardDescription>
                      <CardTitle className="text-xl font-semibold">
                        ${(resumenIngresos.totalEntrenador || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Cuota Seguro</CardDescription>
                      <CardTitle className="text-xl font-semibold">
                        ${(resumenIngresos.totalSeguro || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              )}

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Socio</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Deportes</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Fecha de Pago</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagosFiltrados.length > 0 ? (
                      pagosFiltrados.map((pago: any) => {
                        const socio = personas.find(p => Number(p.id) === Number(pago.socioId));
                        const cuotasDePago = cuotas.filter(c => Number(c.pagoId) === Number(pago.id));
                        const deportesNombres = cuotasDePago
                          .map(c => {
                            const deporte = deportes.find(d => Number(d.id) === Number(c.deporteId));
                            return deporte?.nombre || 'Deporte';
                          })
                          .filter(Boolean)
                          .join(', ') || '—';

                        return (
                          <TableRow key={`filtro-${pago.id}`}>
                            <TableCell className="font-medium">{socio ? `${socio.nombre} ${socio.apellido}` : '—'}</TableCell>
                            <TableCell>{socio?.dni || '—'}</TableCell>
                            <TableCell>{deportesNombres}</TableCell>
                            <TableCell className="font-semibold text-green-700">${(pago.montoTotal || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getMetodoPagoLabel(pago.metodoPago)}</Badge>
                            </TableCell>
                            <TableCell>
                              {formatearFechaDisplay(pago.fechaPago)}
                            </TableCell>
                            <TableCell>{pago.observaciones || '—'}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          {cargandoReporte ? 'Buscando ingresos...' : 'No se encontraron ingresos registrados para el criterio seleccionado.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}