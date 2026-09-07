import { Fragment, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Edit, Trash2, Search, UserPlus, History, ArrowUpDown, SquareArrowDown, SquareArrowRight} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import personaService from '../services/personaService';
import deporteService from '../services/deporteService';
import registroService from '../services/registroService';
import promocionService from '../services/promocionService';
import type { Persona } from '../types/persona';
import type { Deporte } from '../types/deporte';
import type { Registro } from '../types/registro';
import type { Promocion } from '../types/promocion';
import { Checkbox } from './ui/checkbox';

// Usamos directamente el tipo Persona del backend
type Socio = Persona & {
  responsablePago?: string;
  responsableDni?: string;
  estado: 'activo' | 'inactivo';
};

interface FormSocio {
  nombre?: string;
  apellido?: string;
  dni?: string;
  fechaNacimiento?: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  responsableNombre?: string;
  responsableApellido?: string;
  responsableDni?: string;
  categoria: 'SOCIO' | 'JUGADOR' | 'SOCIOYJUGADOR';
  estado: 'activo' | 'inactivo';
}

interface SociosModuleProps {
  userRole: 'admin' | 'secretario';
}

// Calcula la edad a partir de la fecha de nacimiento
const calcularEdad = (fechaNacimiento: string | null): number => {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
};

export function SociosModule({ userRole }: SociosModuleProps) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historialRegistros, setHistorialRegistros] = useState<Registro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [filterDeporte, setFilterDeporte] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [selectedPromocionId, setSelectedPromocionId] = useState<Number | null>(null);
  const [formData, setFormData] = useState<FormSocio>({
    categoria: 'SOCIO',
    estado: 'activo',
    responsableNombre: '',
    responsableApellido: '',
    responsableDni: '',
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<Socio | null>(null);
  const [observacionBaja, setObservacionBaja] = useState('');
  const [expandedRegistroId, setExpandedRegistroId] = useState<string | null>(null);
  const [registroDuplicado, setRegistroDuplicado] = useState<Registro | null>(null);
  const [pendingSocioData, setPendingSocioData] = useState<any | null>(null);
  const [isRegistroDialogOpen, setIsRegistroDialogOpen] = useState(false);
  const [socioToAltaBaja, setSocioToAltaBaja] = useState<Socio | null>(null);
  const [isAltaBajaDialogOpen, setIsAltaBajaDialogOpen] = useState(false);
  const [historialSearchTerm, setHistorialSearchTerm] = useState('');
  const [historialFilter, setHistorialFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [activeFilter, setActiveFilter] = useState<'activos' | 'inactivos'>('activos');
  const [activeTab, setActiveTab] = useState('socios');
  const [formErrors, setFormErrors] = useState<{ nombre: boolean; apellido: boolean; dni: boolean; fechaNacimiento: boolean; responsableNombre: boolean; responsableApellido: boolean; responsableDni: boolean; telefono: boolean; email:boolean }>({
    nombre: false,
    apellido: false,
    dni: false,
    fechaNacimiento: false,
    responsableNombre: false,
    responsableApellido: false,
    responsableDni: false,
    telefono: false,
    email: false,
  });
  const [fechaNacimientoParts, setFechaNacimientoParts] = useState<{ day: string; month: string; year: string }>({
    day: '',
    month: '',
    year: '',
  });

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' }),
  }));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => String(currentYear - i));
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const DNI_REGEX = /^\d{7,8}$/; // DNI argentino (7 u 8 números)
  const TEL_REGEX = /^\+?[0-9]{10,15}$/;

  const updateFechaNacimiento = (day: string, month: string, year: string) => {
    setFechaNacimientoParts({ day, month, year });
    if (day && month && year) {
      const composed = `${year}-${month}-${day}`;
      setFormData(prev => ({ ...prev, fechaNacimiento: composed }));
      setFormErrors(prev => ({ ...prev, fechaNacimiento: false }));
    } else {
      setFormData(prev => ({ ...prev, fechaNacimiento: null }));
    }
  };

  // Función para cargar registros históricos
  const cargarRegistros = async () => {
    try {
      const registrosResponse = await registroService.getAll();
      setHistorialRegistros(Array.isArray(registrosResponse.data) ? registrosResponse.data : []);
    } catch (err) {
      console.error('Error al cargar registros:', err);
      toast.error('No se pudieron cargar los registros históricos');
    }
  };

  // Manejar cambio de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'historial') {
      cargarRegistros();
    }
  };

  // Función para obtener nombres de deportes a partir de sus IDs
  const getDeportesNombres = (deportesIds?: number[]): string[] => {
    if (!deportesIds || deportesIds.length === 0) return [];
    return deportesIds
      .map(id => deportes.find(d => d.id === id)?.nombre)
      .filter((nombre): nombre is string => nombre !== undefined);
  };
  
  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const mapPersonasToSocios = (personas: Persona[]): Socio[] => {
    const personasMap = new Map(personas.map((p: Persona) => [Number(p.id), p]));
    return personas.map((persona: Persona) => {
      const responsable = persona.socioResponsable || (persona.socioResponsableId ? personasMap.get(Number(persona.socioResponsableId)) : undefined);
      return {
        ...persona,
        responsablePago: persona.socioResponsable
          ? `${persona.socioResponsable.nombre} ${persona.socioResponsable.apellido} (DNI: ${persona.socioResponsable.dni})`
          : responsable ? `${responsable.nombre} ${responsable.apellido} (DNI: ${responsable.dni})` : undefined,
        responsableDni: responsable?.dni,
        estado: persona.activo ? 'activo' : 'inactivo',
        //=========================================================================
        // Asegurarse de que deportes sea un array SACAR CUANDO EL BACKEND LO TENGA
        deportes: Array.isArray(persona.deportes) ? persona.deportes : [], // <-- default
        // Asegurarse de que deportes sea un array SACAR CUANDO EL BACKEND LO TENGA
        //=========================================================================
      };
    });
  };

  // Carga limpia de socios desde el backend
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Cargar deportes
        const deportesResponse = await deporteService.getAll();
        setDeportes(Array.isArray(deportesResponse.data) ? deportesResponse.data : []);
        
        // Cargar promociones
        const promocionesResponse = await promocionService.getAll();
        setPromociones(Array.isArray(promocionesResponse.data) ? promocionesResponse.data : []);
        
        // Cargar personas/socios
        const response = await personaService.getAll();
        const personas = response.data;

        // Transformación mínima para ajustar al frontend
        const sociosFormateados = mapPersonasToSocios(personas);
        setSocios(sociosFormateados);
        
        // Cargar registros históricos
        const registrosResponse = await registroService.getAll();
        setHistorialRegistros(Array.isArray(registrosResponse.data) ? registrosResponse.data : []);
        
        setError(null);
      } catch (err) {
        console.error('Error al cargar socios:', err);
        setError('No se pudieron cargar los socios');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);

  // Filtros
  const filteredSocios = socios.filter(socio => {
    const matchesActive = 
    (activeFilter === 'activos' && socio.activo) || 
    (activeFilter === 'inactivos' && !socio.activo);

    const matchesSearch = 
      socio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socio.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socio.dni.includes(searchTerm);
    
    const matchesCategoria = filterCategoria === 'all' || 
      (filterCategoria === 'socio' && socio.categoria === 'SOCIO') ||
      (filterCategoria === 'jugador' && socio.categoria === 'JUGADOR') ||
      (filterCategoria === 'socio y jugador' && socio.categoria === 'SOCIOYJUGADOR');
    
    const deportesNombres = getDeportesNombres(socio.deportesIds);
    const matchesDeporte = filterDeporte === 'all' || deportesNombres.includes(filterDeporte);
    
    return matchesActive && matchesSearch && matchesCategoria && matchesDeporte;
  });

  const filteredHistorial = historialRegistros
    .filter(registro => {
      const nombreCompleto = `${registro.apellido} ${registro.nombre}`.toLowerCase();
      return (
        nombreCompleto.includes(historialSearchTerm.toLowerCase()) ||
        registro.dni.includes(historialSearchTerm)
      );
    })
    .filter(registro => {
      if (historialFilter === 'activos') {
        return !registro.fechaBaja; // activos: sin fecha de baja
      }
      if (historialFilter === 'inactivos') {
        return !!registro.fechaBaja; // dados de baja: con fecha de baja
      }
      return true; // 'todos'
    });

  // Abrir diálogo para crear/editar
  const handleOpenDialog = (socio?: Socio) => {
    if (socio) {
      setEditingSocio(socio);
      setSelectedPromocionId(socio.promocionId || null);
      const responsable = socio.socioResponsable || (socio.socioResponsableId ? socios.find(s => Number(s.id) === Number(socio.socioResponsableId)) : undefined);
      setFormData({
        nombre: socio.nombre,
        apellido: socio.apellido,
        dni: socio.dni,
        fechaNacimiento: socio.fechaNacimiento,
        direccion: socio.direccion,
        telefono: socio.telefono,
        correo: socio.email,
        responsableNombre: responsable?.nombre || '',
        responsableApellido: responsable?.apellido || '',
        responsableDni: responsable?.dni || '',
        categoria: socio.categoria,
        estado: socio.estado,
      });

      const fecha = socio.fechaNacimiento ? new Date(socio.fechaNacimiento) : null;
      setFechaNacimientoParts({
        day: fecha ? String(fecha.getDate()).padStart(2, '0') : '',
        month: fecha ? String(fecha.getMonth() + 1).padStart(2, '0') : '',
        year: fecha ? String(fecha.getFullYear()) : '',
      });
    } else {
      setEditingSocio(null);
      setSelectedPromocionId(null);
      setFormData({
        categoria: 'SOCIO',
        estado: 'activo',
        responsableNombre: '',
        responsableApellido: '',
        responsableDni: '',
      });
      setFechaNacimientoParts({ day: '', month: '', year: '' });
    }
    setFormErrors({ nombre: false, apellido: false, dni: false, fechaNacimiento: false, responsableNombre: false, responsableApellido: false, responsableDni: false, telefono: false, email: false });
    setIsDialogOpen(true);
  };

  // Guardar socio (crear o actualizar)
  const handleSave = async () => {
    const errors = {
      nombre: !(formData.nombre && formData.nombre.trim().length > 0),
      apellido: !(formData.apellido && formData.apellido.trim().length > 0),
      dni: !(formData.dni && formData.dni.trim().length > 0),
      fechaNacimiento: false,
      responsableNombre: formData.categoria === 'JUGADOR' ? !(formData.responsableNombre && formData.responsableNombre.trim().length > 0) : false,
      responsableApellido: formData.categoria === 'JUGADOR' ? !(formData.responsableApellido && formData.responsableApellido.trim().length > 0) : false,
      responsableDni: formData.categoria === 'JUGADOR' ? !(formData.responsableDni && formData.responsableDni.trim().length > 0) : false,
    };

    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const socioData = {
      nombre: formData.nombre || '',
      apellido: formData.apellido || '',
      dni: formData.dni || '',
      fechaNacimiento: formData.fechaNacimiento || null,
      email: formData.correo || null,
      telefono: formData.telefono || null,
      direccion: formData.direccion || null,
      categoria: formData.categoria,
      promocionId: selectedPromocionId || null,
      ...(formData.categoria === 'JUGADOR' && formData.responsableDni ? { socioResponsableDni: formData.responsableDni } : {}),
    };
    
    try {
      if (editingSocio) {
        toast.promise(personaService.update(parseInt(editingSocio.id), socioData), {
          loading: 'Actualizando socio...',
          success: '¡Socio actualizado correctamente!',
          error: 'No se pudo actualizar al socio',
        });    
      } else {
        toast.promise(personaService.create(socioData), {
          loading: 'Registrando nuevo socio...',
          success: '¡Socio registrado correctamente!',
          error: 'No se pudo regitrar al socio',
        });
      }

      // Recargar la lista
      const response = await personaService.getAll();
      const personas = response.data;
      const sociosActualizados = mapPersonasToSocios(personas);
      setSocios(sociosActualizados);

      setIsDialogOpen(false);
      setFormData({ categoria: 'SOCIO', estado: 'activo', responsableNombre: '', responsableApellido: '', responsableDni: '' });
    } catch (error) {
      console.error('Error al guardar socio:', error);
      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      if (status === 409 && data?.registro) {
        setRegistroDuplicado(data.registro as Registro);
        setPendingSocioData(socioData);
        setIsRegistroDialogOpen(true);
        return;
      }
      const message = data;
      toast.error(typeof message === 'string' && message.trim().length > 0
        ? message
        : (editingSocio ? 'Error al actualizar socio' : 'Error al registrar socio'));
    }
  };

  const handleConfirmRegistro = async () => {
    if (!pendingSocioData) return;
    try {
      await personaService.create({ ...pendingSocioData, usarRegistroExistente: true });
      toast.success('Socio registrado correctamente');
      const response = await personaService.getAll();
      const personas = response.data;
      setSocios(mapPersonasToSocios(personas));
      setIsDialogOpen(false);
      setFormData({ categoria: 'SOCIO', estado: 'activo', responsableNombre: '', responsableApellido: '', responsableDni: '' });
      setIsRegistroDialogOpen(false);
      setRegistroDuplicado(null);
      setPendingSocioData(null);
    } catch (err) {
      console.error('Error al registrar socio con registro existente:', err);
      toast.error('Error al registrar socio');
    }
  };

  // Eliminar socio
  const handleDelete = (id: string) => {
    if (userRole !== 'admin') {
      toast.error('No tienes permisos para eliminar socios');
      return;
    }
    
    const socioAEliminar = socios.find(s => s.id === id);
    if (socioAEliminar) {
      setSocioToDelete(socioAEliminar);
      setObservacionBaja('');
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (socioToDelete) {
      try {
        await personaService.delete(parseInt(socioToDelete.id), observacionBaja || undefined);
        setSocios(socios.filter(s => s.id !== socioToDelete.id));
        setIsDeleteDialogOpen(false);
        setSocioToDelete(null);
        setObservacionBaja('');
        toast.success('Socio eliminado correctamente');
      } catch (error) {
        console.error('Error al eliminar socio:', error);
        toast.error('Error al eliminar socio');
      }
    }
  };

  // Etiquetas para categorías
  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      'SOCIO': 'Socio',
      'JUGADOR': 'Jugador',
      'SOCIOYJUGADOR': 'Socio y Jugador',
    };
    return labels[categoria] || categoria;
  };

  const getCategoriaFrontendValue = (categoria: string): 'socio' | 'jugador' | 'socio y jugador' => {
    switch (categoria) {
      case 'SOCIO': return 'socio';
      case 'JUGADOR': return 'jugador';
      case 'SOCIOYJUGADOR': return 'socio y jugador';
      default: return 'socio';
    }
  };

  const handleAltaBaja = (id: string) => {
    const socioADarAltaBaja = socios.find(s => s.id === id);
    if(socioADarAltaBaja){
        setSocioToAltaBaja(socioADarAltaBaja);
        setIsAltaBajaDialogOpen(true);
    }
  }

  const handleConfirmAltaBaja = async () => {
    if(socioToAltaBaja){
      try{
        await personaService.toggleActive(parseInt(socioToAltaBaja.id), observacionBaja || undefined);

        // Buscamos al socio en la lista y mapeamos el array
        const sociosActualizados = socios.map(s => {
          if (s.id === socioToAltaBaja.id) {
            // Retornamos el socio con el estado invertido
            return { ...s, activo: !s.activo }; 
          }
          return s;
        });
        setSocios(sociosActualizados);

        setObservacionBaja('');
        setIsAltaBajaDialogOpen(false);
        setSocioToAltaBaja(null);
        if(socioToAltaBaja.activo){
          toast.warning('Socio dado de BAJA correctamente');
        }
        else{
          toast.success('Socio dado de ALTA correctamente');
        }
      } catch (error) {
        console.error('Error al dar Alta/Baja del Socio');
        toast.error('Error al dar Alta/Baja del Socio');
      }
    }
  }

  if (loading) return <div>Cargando socios...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Socios</CardTitle>
              <CardDescription>Alta, baja y modificación de socios del club</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nuevo Socio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSocio ? 'Editar Socio' : 'Nuevo Socio'}</DialogTitle>
                  <DialogDescription>
                    Complete los datos del socio. Los campos marcados son obligatorios.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, apellido: e.target.value });
                        if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, apellido: false }));
                      }}
                      className={formErrors.apellido ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      required
                    />
                    {formErrors.apellido && (
                      <p className="text-xs text-red-600">Completa el apellido</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value });
                        if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, nombre: false }));
                      }}
                      className={formErrors.nombre ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      required
                    />
                    {formErrors.nombre && (
                      <p className="text-xs text-red-600">Completa el nombre</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI *</Label>
                    <Input
                      id="dni"
                      value={formData.dni || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, dni: val });
                        setFormErrors(prev => ({ 
                        ...prev, 
                        dni: val.trim().length === 0 || !DNI_REGEX.test(val) 
                        }));
                        }}
                        className={formErrors.dni ? 'border-red-500' : ''}
                    />
                    {formErrors.dni && (
                      <p className="text-xs text-red-600 mt-1">
                      {formData.dni?.length === 0 ? 'Completa el DNI' : 'DNI inválido (debe tener 7 u 8 números)'}
                    </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={fechaNacimientoParts.day}
                        onValueChange={(value) => updateFechaNacimiento(value, fechaNacimientoParts.month, fechaNacimientoParts.year)}
                        className={formErrors.fechaNacimiento ? 'border-red-500 focus-visible:ring-red-500' : ''}                        
                      >
                        <SelectTrigger aria-label="Día">
                          <SelectValue placeholder="Día" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={fechaNacimientoParts.month}
                        onValueChange={(value) => updateFechaNacimiento(fechaNacimientoParts.day, value, fechaNacimientoParts.year)}
                        className={formErrors.fechaNacimiento ? 'border-red-500 focus-visible:ring-red-500' : ''} 
                      >
                        <SelectTrigger aria-label="Mes">
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={fechaNacimientoParts.year}
                        onValueChange={(value) => updateFechaNacimiento(fechaNacimientoParts.day, fechaNacimientoParts.month, value)}
                        className={formErrors.fechaNacimiento ? 'border-red-500 focus-visible:ring-red-500' : ''}                     
                      >
                        <SelectTrigger aria-label="Año">
                          <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formErrors.fechaNacimiento && (
                      <p className="text-xs text-red-600">Completa día, mes y año</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion || ''}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}                    
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, telefono: val });
                        // El teléfono suele ser opcional, validamos solo si hay algo escrito
                        setFormErrors(prev => ({ 
                        ...prev, 
                        telefono: val.length > 0 && !TEL_REGEX.test(val) 
                        }));
                      }}
                      className={formErrors.telefono ? 'border-red-500' : ''}                   
                    />
                    {formErrors.telefono && (
                    <p className="text-xs text-red-600 mt-1">Formato de teléfono inválido (solo números (entre 10 y 15))</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correo">Correo Electrónico</Label>
                    <Input
                      id="correo"
                      type="email"
                      value={formData.correo || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, correo: val });
                        // Validamos solo si hay algo escrito
                        setFormErrors(prev => ({ 
                        ...prev, 
                        email: val.length > 0 && !EMAIL_REGEX.test(val) 
                        }));
                      }}
                      className={formErrors.email ? 'border-red-500' : ''}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-600 mt-1">Ingresa un correo electrónico válido</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría *</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => {
                        const nextCategoria = value as any;
                        setFormData({
                          ...formData,
                          categoria: nextCategoria,
                          ...(nextCategoria !== 'JUGADOR'
                            ? { responsableNombre: '', responsableApellido: '', responsableDni: '' }
                            : {}),
                        });
                        if (nextCategoria !== 'JUGADOR') {
                          setFormErrors(prev => ({ ...prev, responsableNombre: false, responsableApellido: false, responsableDni: false }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SOCIO">Socio</SelectItem>
                        <SelectItem value="JUGADOR">Jugador</SelectItem>
                        <SelectItem value="SOCIOYJUGADOR">Socio y Jugador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.categoria === 'JUGADOR' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="responsableApellido">Apellido del Responsable *</Label>
                        <Input
                          id="responsableApellido"
                          value={formData.responsableApellido || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, responsableApellido: e.target.value });
                            if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, responsableApellido: false }));
                          }}
                          className={formErrors.responsableApellido ? 'border-red-500 focus-visible:ring-red-500' : ''}
                          required
                        />
                        {formErrors.responsableApellido && (
                          <p className="text-xs text-red-600">Completa el apellido del responsable</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="responsableNombre">Nombre del Responsable *</Label>
                        <Input
                          id="responsableNombre"
                          value={formData.responsableNombre || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, responsableNombre: e.target.value });
                            if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, responsableNombre: false }));
                          }}
                          className={formErrors.responsableNombre ? 'border-red-500 focus-visible:ring-red-500' : ''}
                          required
                        />
                        {formErrors.responsableNombre && (
                          <p className="text-xs text-red-600">Completa el nombre del responsable</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="responsableDni">DNI del Responsable *</Label>
                        <Input
                          id="responsableDni"
                          value={formData.responsableDni || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, responsableDni: e.target.value });
                            if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, responsableDni: false }));
                          }}
                          className={formErrors.responsableDni ? 'border-red-500 focus-visible:ring-red-500' : ''}
                          required
                        />
                        {formErrors.responsableDni && (
                          <p className="text-xs text-red-600">Completa el DNI del responsable</p>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>Promociones</Label>
                    <div
                      className="border rounded-lg divide-y overflow-y-auto"
                      style={{ maxHeight: promociones.filter(p => p.activo !== false).length > 4 ? 200 : undefined }}
                    >
                      {promociones.filter(p => p.activo !== false).map(promo => {
                        const isSelected = selectedPromocionId === Number(promo.id);
                        return (
                          <div key={promo.id} className="flex items-start gap-3 p-3">
                            <Checkbox
                              id={`promo-${promo.id}`}
                              checked={isSelected}
                              onCheckedChange={(val) => {
                                setSelectedPromocionId(val ? Number(promo.id) : null);
                              }}
                            />
                            <label htmlFor={`promo-${promo.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium">{promo.nombre}</div>
                              {promo.descripcion && (
                                <div className="text-sm text-gray-500">{promo.descripcion}</div>
                              )}
                              <div className="text-xs font-bold text-blue-600">
                                {promo.descuento}{promo.tipoDescuento === 'PORCENTAJE' ? '%' : '$'} de descuento
                              </div>
                            </label>
                          </div>
                        );
                      })}
                      {promociones.filter(p => p.activo !== false).length === 0 && (
                        <div className="p-3 text-sm text-gray-500">No hay promociones activas</div>
                      )}
                    </div>
                    {selectedPromocionId && (
                      <p className="text-sm text-gray-600">
                        Se aplicará esta promoción al socio.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingSocio ? 'Guardar Cambios' : 'Registrar Socio'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Dialog de Confirmación de Eliminación */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Eliminar Socio</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas eliminar a {socioToDelete?.apellido}, {socioToDelete?.nombre}?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="observacionBaja">Observación de Baja (opcional)</Label>
                    <Input
                      id="observacionBaja"
                      placeholder="Ej: Traslado a otra ciudad, cambio de trabajo..."
                      value={observacionBaja}
                      onChange={(e) => setObservacionBaja(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleConfirmDelete}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isRegistroDialogOpen} onOpenChange={setIsRegistroDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Persona ya registrada</DialogTitle>
                  <DialogDescription>
                    {registroDuplicado?.dni
                      ? `Esta persona ya se encuentra en el registro (DNI: ${registroDuplicado.dni}).`
                      : 'Esta persona ya se encuentra en el registro.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <div><span className="font-semibold">Apellido:</span> {registroDuplicado?.apellido || '-'}</div>
                    <div><span className="font-semibold">Nombre:</span> {registroDuplicado?.nombre || '-'}</div>
                    <div><span className="font-semibold">DNI:</span> {registroDuplicado?.dni || '-'}</div>
                  </div>
                  <p className="text-sm text-gray-600">
                    ¿Desea crear la persona usando los datos del registro y completar con los datos ingresados?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsRegistroDialogOpen(false);
                      setRegistroDuplicado(null);
                      setPendingSocioData(null);
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleConfirmRegistro}>
                      Aceptar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* Dialog de Confirmación de Alta/Baja */}
            <Dialog open={isAltaBajaDialogOpen} onOpenChange={setIsAltaBajaDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Dar Alta/Baja Socio</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas dar de {' '}
                    <span style={{ color: socioToAltaBaja?.activo ? 'orange' : 'green', fontWeight: 'bold' }}>
                      {socioToAltaBaja?.activo ? 'BAJA' : 'ALTA'}
                    </span>
                    {' '} a {socioToAltaBaja?.apellido}, {socioToAltaBaja?.nombre}?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {socioToAltaBaja?.activo && 
                  (<div>
                    <Label htmlFor="observacionAltaBaja">Observación de Baja (opcional)</Label>
                    <Input
                      id="observacionBaja"
                      placeholder="Ej: Traslado a otra ciudad, cambio de trabajo..."
                      value={observacionBaja}
                      onChange={(e) => setObservacionBaja(e.target.value)}
                      className="mt-2"
                    />
                  </div>)}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAltaBajaDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      style={{ 
                        backgroundColor: socioToAltaBaja?.activo ? '#f97316' : '#16a34a', 
                        color: 'white',
                        display: 'inline-flex' 
                      }}
                      onClick={handleConfirmAltaBaja}
                    >
                      {socioToAltaBaja?.activo ? 'Confirmar Baja' : 'Confirmar Alta'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="socios">
                <UserPlus className="w-4 h-4 mr-2" />
                Socios Activos
              </TabsTrigger>
              <TabsTrigger value="historial">
                <History className="w-4 h-4 mr-2" />
                Historial de Registros
              </TabsTrigger>
            </TabsList>

            {/* Tab de Socios */}
            <TabsContent value="socios" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="relative sm:col-span-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nombre, apellido o DNI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    <SelectItem value="socio">Socio</SelectItem>
                    <SelectItem value="jugador">Jugador</SelectItem>
                    <SelectItem value="socio y jugador">Socio y Jugador</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDeporte} onValueChange={setFilterDeporte}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los deportes</SelectItem>
                    {deportes.map((deporte) => (
                      <SelectItem key={deporte.id} value={deporte.nombre}>
                        {deporte.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar filtro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activos">Activos</SelectItem>
                      <SelectItem value="inactivos">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apellido y Nombre</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Deportes</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSocios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                          No se encontraron socios
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSocios.map((socio) => (
                        <TableRow key={socio.id}>
                          <TableCell>
                            <div>
                              <div>{socio.apellido}, {socio.nombre}</div>
                              {socio.responsablePago && (
                                <div className="text-sm text-gray-400">Responsable: {socio.responsablePago}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{socio.dni}</div>
                              {socio.responsablePago && (
                                <div className="text-sm text-gray-400">DNI responsable: {socio.responsableDni || '-'}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoriaLabel(socio.categoria)}</Badge>
                          </TableCell>
                          <TableCell>
                          {calcularEdad(socio?.fechaNacimiento) === 0 
                          ? "Sin edad" 
                          : `${calcularEdad(socio?.fechaNacimiento)} años`}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{(socio?.telefono || "Sin teléfono")}</div>
                              <div className="text-gray-500">{socio?.email || "Sin email"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getDeportesNombres(socio.deportesIds).length > 0 ? (
                                getDeportesNombres(socio.deportesIds).map((deporte, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {deporte}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-gray-400">Sin deportes</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(socio.fechaRegistro)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAltaBaja(socio.id)}
                              >
                                <ArrowUpDown color="#ea580c" className="w-4 h-4"/>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(socio)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {userRole === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(socio.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-gray-500">
                Mostrando {filteredSocios.length} de {socios.length} socios
              </div>
            </TabsContent>

            {/* Tab de Historial */}
            <TabsContent value="historial" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Este es un registro histórico de todos los socios registrados en el sistema. Este listado es de solo lectura y no puede ser modificado.
                </p>
              </div>

              {/* Búsqueda y filtro en historial */}
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar en historial por nombre o DNI..."
                    value={historialSearchTerm}
                    onChange={(e) => setHistorialSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-full md:w-64">
                  <Label className="mb-1 block">Filtro</Label>
                  <Select value={historialFilter} onValueChange={(v) => setHistorialFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar filtro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activos">Activos</SelectItem>
                      <SelectItem value="inactivos">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabla de Historial */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead>Fecha de Baja</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistorial.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No se encontraron registros
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistorial.map((registro, index) => (
                        <Fragment>
                        <TableRow key={`registro-${registro.id}`}>
                          <TableCell className="text-center">
                            {registro.fechaBaja && (
                              <button
                                onClick={() => setExpandedRegistroId(expandedRegistroId === registro.id ? null : registro.id)}
                                className="text-blue-600 hover:text-blue-800 cursor-pointer text-lg leading-none"
                              >
                                {expandedRegistroId === registro.id ? <SquareArrowDown/> : <SquareArrowRight/>}
                              </button>
                            )}
                          </TableCell>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{registro.apellido}, {registro.nombre}</TableCell>
                          <TableCell>{registro.dni}</TableCell>
                          <TableCell>{formatDate(registro.fechaRegistro)}</TableCell>
                          <TableCell>
                            {registro.fechaBaja ? formatDate(registro.fechaBaja) : '-'}
                          </TableCell>
                        </TableRow>
                        {/* Filas expandidas con observación de baja */}
                        {expandedRegistroId === registro.id && registro.fechaBaja && (
                          <TableRow key={`expanded-${registro.id}`} className="bg-gray-50">
                            <TableCell colSpan={6} className="py-4">
                              <div className="pl-8 border-l-2 border-blue-400">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Razón de Baja:</p>
                                <p className="text-sm text-gray-600 italic">{registro?.observacionBaja || "Sin especificar"}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-gray-500">
                Mostrando {filteredHistorial.length} de {historialRegistros.length} registros históricos
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}