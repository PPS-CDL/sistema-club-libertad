import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Download, FileText, DollarSign, TrendingUp, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import cuotaService from '../services/cuotaService';
import pagoService from '../services/pagoService';
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
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [pagosServidor, setPagosServidor] = useState<any[]>([]);
  const [searchCuota, setSearchCuota] = useState<string>('');
  const [filterDeportePago, setFilterDeportePago] = useState<string>('all');
  const [filterMesPago, setFilterMesPago] = useState<string>('all');
  const [expandedPagos, setExpandedPagos] = useState<Set<string>>(new Set());

  // Helper para extraer mes-año de periodo sin problemas de timezone
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

      // Primero actualizar cuotas vencidas
      await cuotaService.actualizarCuotasVencidas();

      // Luego generar cuotas del mes actual si faltan
      await cuotaService.generarCuotasMesActual();

      // Luego cargar todas las cuotas, personas y deportes en paralelo
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

      // Mapear por ID para acceso rápido
      const personaMap = new Map<number, Persona>(personasData.map(p => [Number(p.id), p] as const));
      const deporteMap = new Map<number, Deporte>(deportesData.map(d => [Number(d.id), d] as const));

      // Transformar cuotas a pagos para mostrar en la tabla
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

  // Cargar cuotas del backend al montar
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
    // En producción, esto generaría el archivo real según especificaciones de Red Link
    const pagosPendientes = pagos.filter(p => p.estado === 'pendiente' && p.metodoPago === 'DEBITO_AUTOMATICO');
    
    if (pagosPendientes.length === 0) {
      toast.error('No hay pagos pendientes para débito automático');
      return;
    }

    // Simular generación de archivo
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

  const generarReporte = (tipo: 'ingresos' | 'deudas') => {
    if (tipo === 'ingresos') {
      const ingresos = pagos.filter(p => p.estado === 'pagado');
      const total = ingresos.reduce((sum, p) => sum + p.monto, 0);
      toast.success(`Reporte de ingresos: $${total.toLocaleString()}`);
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
          <Tabs defaultValue="todos">
            <TabsList>
              <TabsTrigger value="todos">Cuotas</TabsTrigger>
              <TabsTrigger value="pagados">Pagadas</TabsTrigger>
              <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              <TabsTrigger value="vencidos">Vencidas</TabsTrigger>
              <TabsTrigger value="pagos">Pagos</TabsTrigger>
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
                              {pago.fecha ? new Date(pago.fecha).toLocaleDateString() : '-'}
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
              {/* Filtros por deporte y mes */}
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
                        <SelectItem key={deporte.id} value={deporte.id}>
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
                          // Si no hay filtro de deporte, mostrar todos
                          const matchesDeporte = (() => {
                            if (filterDeportePago === 'all') return true;
                            const cuotasDePago = cuotas.filter(c => Number(c.pagoId) === Number(pago.id));
                            return cuotasDePago.some(c => Number(c.deporteId) === Number(filterDeportePago));
                          })();

                          const matchesMes = (() => {
                            if (filterMesPago === 'all') return true;
                            if (!pago.fechaPago) return false;
                            const mesPago = new Date(pago.fechaPago).getMonth() + 1; // 1-12
                            return mesPago === Number(filterMesPago);
                          })();

                          return matchesDeporte && matchesMes;
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
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}