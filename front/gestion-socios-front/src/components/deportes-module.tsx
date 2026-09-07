import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, Users as UsersIcon, DollarSign, UserPlus, UserMinus, Check } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import deporteService from '../services/deporteService';
import personaService from '../services/personaService';
import inscripcionService from '../services/inscripcionService';
import type { Deporte } from '../types/deporte';
import type { Persona } from '../types/persona';

interface DeportesModuleProps {
  userRole: 'admin' | 'secretario';
}

export function DeportesModule({ userRole }: DeportesModuleProps) {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [isDeassociateDialogOpen, setIsDeassociateDialogOpen] = useState(false);
  const [editingDeporte, setEditingDeporte] = useState<Deporte | null>(null);
  const [formData, setFormData] = useState<{ nombre: string; descripcion?: string; cuotaEntrenador: number; cuotaSeguro: number; cuotaSocial: number }>({ nombre: '', descripcion: '', cuotaEntrenador: 0, cuotaSeguro: 0, cuotaSocial: 0 });
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [selectedDeportes, setSelectedDeportes] = useState<number[]>([]);
  const [searchPersona, setSearchPersona] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ nombre: boolean; cuotaEntrenador: boolean; cuotaSeguro: boolean; cuotaSocial: boolean }>({
    nombre: false,
    cuotaEntrenador: false,
    cuotaSeguro: false,
    cuotaSocial: false,
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const totalCuota = (formData.cuotaEntrenador ?? 0) + (formData.cuotaSeguro ?? 0) + (formData.cuotaSocial ?? 0);

  const deportesActivosDePersona = deportes.filter((deporte: Deporte) => 
    deporte.personasIds?.includes(selectedPersonaId)
  );
  
  // Cargar deportes desde el backend
  const loadDeportes = async () => {
    try {
      setLoading(true);
      const response = await deporteService.getAll();
      const data = response?.data;
      setDeportes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Error al cargar los deportes');
      console.error('Error loading deportes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar personas desde el backend
  const loadPersonas = async () => {
    try {
      const response = await personaService.getAll();
      const data = response?.data;
      setPersonas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading personas:', error);
    }
  };

  useEffect(() => {
    loadDeportes();
    loadPersonas();
  }, []);

  const handleOpenDialog = (deporte?: Deporte) => {
    if (deporte) {
      setEditingDeporte(deporte);
      setFormData({
        nombre: deporte.nombre,
        descripcion: deporte.descripcion ?? '',
        cuotaEntrenador: deporte.cuotaEntrenador ?? 0,
        cuotaSeguro: deporte.cuotaSeguro ?? 0,
        cuotaSocial: deporte.cuotaSocial ?? 0,
      });
    } else {
      setEditingDeporte(null);
      setFormData({ nombre: '', descripcion: '', cuotaEntrenador: 0, cuotaSeguro: 0, cuotaSocial: 0 });
    }
    setFormErrors({ nombre: false, cuotaEntrenador: false, cuotaSeguro: false, cuotaSocial: false });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const errors = {
      nombre: !(formData.nombre && formData.nombre.trim().length > 0),
      cuotaEntrenador: formData.cuotaEntrenador === null || formData.cuotaEntrenador === undefined,
      cuotaSeguro: formData.cuotaSeguro === null || formData.cuotaSeguro === undefined,
      cuotaSocial: formData.cuotaSocial === null || formData.cuotaSocial === undefined,
    };

    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      cuotaEntrenador: formData.cuotaEntrenador,
      cuotaSeguro: formData.cuotaSeguro,
      cuotaSocial: formData.cuotaSocial,
    };

    try {
      if (editingDeporte && editingDeporte.id) {
        await deporteService.update(editingDeporte.id, payload);
        toast.success('Deporte actualizado correctamente');
      } else {
        await deporteService.create(payload);
        toast.success('Deporte registrado correctamente');
      }
      setIsDialogOpen(false);
      await loadDeportes(); // Recargar la lista
    } catch (error) {
      toast.error(editingDeporte ? 'Error al actualizar el deporte' : 'Error al crear el deporte');
    }
  };

  const handleDelete = async (id: number) => {
    if (userRole !== 'admin') {
      toast.error('No tienes permisos para eliminar deportes');
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar este deporte?')) return;

    try {
      await deporteService.delete(id);
      toast.success('Deporte eliminado correctamente');
      await loadDeportes();
    } catch (error) {
      toast.error('Error al eliminar el deporte');
    }
  };

  const handleOpenAssociateDialog = () => {
    setSelectedPersonaId(null);
    setSelectedDeportes([]);
    setSearchPersona('');
    setIsDropdownOpen(false);
    setIsAssociateDialogOpen(true);
  };

  const handleOpenDeassociateDialog = () => {
    setSelectedPersonaId(null);
    setSelectedDeportes([]);
    setSearchPersona('');
    setIsDropdownOpen(false);
    setIsDeassociateDialogOpen(true);
  };

  const handleToggleDeporte = (deporteId: number) => {
    setSelectedDeportes(prev =>
      prev.includes(deporteId)
        ? prev.filter(id => id !== deporteId)
        : [...prev, deporteId]
    );
  };

  const handleAssociate = async () => {
    if (!selectedPersonaId || selectedDeportes.length === 0) {
      toast.error('Selecciona una persona y al menos un deporte');
      return;
    }

    try {
      const personaIdNum = parseInt(selectedPersonaId);
      
      // Asociar cada deporte seleccionado y crear la inscripción correspondiente
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      const fechaInscripcion = `${yyyy}-${mm}-${dd}`; // Formato YYYY-MM-DD

      for (const deporteId of selectedDeportes) {
        await personaService.asociarDeporte(personaIdNum, deporteId);
        await inscripcionService.create({
          personaId: personaIdNum,
          deporteId,
          fechaInscripcion,
        });
      }

      toast.success(`Persona asociada e inscripta a ${selectedDeportes.length} deporte(s) correctamente`);
      setIsAssociateDialogOpen(false);
      await loadDeportes();
      await loadPersonas();
    } catch (error) {
      toast.error('Error al asociar e inscribir deportes');
      console.error('Error:', error);
    }
  };

  const handleDeassociate = async () => {
    if (!selectedPersonaId || selectedDeportes.length === 0) {
      toast.error('Selecciona una persona y al menos un deporte');
      return;
    }

    try {
      const personaIdNum = parseInt(selectedPersonaId);

      for (const deporteId of selectedDeportes) {
        await personaService.desasociarDeporte(personaIdNum, deporteId);
        await inscripcionService.darBaja(personaIdNum, deporteId);
      }

      toast.success(`Persona desasociada a ${selectedDeportes.length} deporte(s) correctamente`);
      setIsDeassociateDialogOpen(false);
      await loadDeportes();
      await loadPersonas();
    } catch (error) {
      toast.error('Error al Desasociar e Desincribir deportes');
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">Cargando deportes...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Deportes</CardDescription>
              <CardTitle>{Array.isArray(deportes) ? deportes.length : 0}</CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-3">
              <CardDescription>Ingresos Mensuales Potenciales</CardDescription>
              <CardTitle>
                ${Array.isArray(deportes)
                  ? deportes
                      .reduce((sum, d) => {
                        const socios = d.numeroSocios ?? d.personasIds?.length ?? 0;
                        return sum + d.cuotaMensual * socios;
                      }, 0)
                      .toLocaleString()
                  : (0).toLocaleString()}
              </CardTitle>
            </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Deportes y Actividades</CardTitle>
              <CardDescription>Gestión de deportes ofrecidos por el club</CardDescription>
            </div>
            <div className="flex gap-2">

              <Dialog open={isDeassociateDialogOpen} onOpenChange={setIsDeassociateDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" onClick={handleOpenDeassociateDialog}>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Desasociar Persona
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Desasociar Persona a Deportes</DialogTitle>
                    <DialogDescription>
                      Selecciona una persona y los deportes a los que deseas desinscribirla
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="persona">Persona *</Label>
                      <div className="relative">
                        <Input
                          id="search-persona"
                          type="text"
                          placeholder="Buscar por nombre, apellido o DNI..."
                          value={searchPersona}
                          onFocus={() => setIsDropdownOpen(true)} // Abrir al hacer click
                          onChange={(e) => {
                            setSearchPersona(e.target.value);
                            setIsDropdownOpen(true); // Asegurar que se abra al escribir
                            if (selectedPersonaId) setSelectedPersonaId(null); // Resetear selección si vuelve a escribir
                            }}
                        />
                        {isDropdownOpen && searchPersona.trim().length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                            {personas
                              .filter((persona) => {
                                const search = searchPersona.toLowerCase().trim();
                                if(searchPersona.includes(" - DNI: ")) return true;
                                
                                const nombreCompleto = `${persona.nombre} ${persona.apellido}`.toLowerCase();
                                return nombreCompleto.includes(search) || 
                                       persona.dni?.toLowerCase().includes(search);
                              })
                              .map((persona) => (
                                <div
                                  key={persona.id}
                                  onClick={() => {
                                    setSelectedPersonaId(persona.id);
                                    setSearchPersona(`${persona.nombre} ${persona.apellido} - DNI: ${persona.dni}`);
                                    setIsDropdownOpen(false);
                                    setSelectedDeportes([]);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                    selectedPersonaId === persona.id ? 'bg-gray-50' : ''
                                  }`}
                                >
                                  {selectedPersonaId === persona.id && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                  <span>
                                    {persona.nombre} {persona.apellido} - DNI: {persona.dni}
                                  </span>
                                </div>
                              ))}
                            {personas.filter((persona) => {
                              const search = searchPersona.toLowerCase().trim();
                              const nombreCompleto = `${persona.nombre} ${persona.apellido}`.toLowerCase();
                              return nombreCompleto.includes(search) || 
                                     persona.dni?.toLowerCase().includes(search);
                            }).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No se encontraron personas
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Deportes donde esta inscripto *</Label>
                      <div
                        className="border rounded-lg divide-y overflow-y-auto"
                        style={{ maxHeight: deportes.length > 4 ? 220 : undefined }}
                      >
                        {selectedPersonaId ? (
                          deportesActivosDePersona.length > 0 ? (
                            deportesActivosDePersona.map((deporte) => (
                          <div
                            key={deporte.id}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-50"
                          >
                            <Checkbox
                              id={`deporte-${deporte.id}`}
                              checked={selectedDeportes.includes(deporte.id!)}
                              onCheckedChange={() => handleToggleDeporte(deporte.id!)}
                            />
                            <label
                              htmlFor={`deporte-${deporte.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium">{deporte.nombre}</div>
                            </label>
                          </div>
                        ))) : (
                          <div className="p-4 text-center text-sm text-gray-500 italic">
                            Esta persona no registra inscripciones en ningún deporte.
                          </div>
                        )) : (
                          <div className="p-4 text-center text-sm text-gray-400">
                            Primero selecciona una persona para ver sus deportes.
                          </div>
                        )}
                      </div>
                      {selectedDeportes.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {selectedDeportes.length} deporte(s) seleccionado(s)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeassociateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleDeassociate}>
                      Deasociar Deportes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAssociateDialogOpen} onOpenChange={setIsAssociateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={handleOpenAssociateDialog}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Asociar Persona
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Asociar Persona a Deportes</DialogTitle>
                    <DialogDescription>
                      Selecciona una persona y los deportes a los que deseas inscribirla
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="persona">Persona *</Label>
                      <div className="relative">
                        <Input
                          id="search-persona"
                          type="text"
                          placeholder="Buscar por nombre, apellido o DNI..."
                          value={searchPersona}
                          onFocus={() => setIsDropdownOpen(true)} // Abrir al hacer click
                          onChange={(e) => {
                            setSearchPersona(e.target.value);
                            setIsDropdownOpen(true); // Asegurar que se abra al escribir
                            if (selectedPersonaId) setSelectedPersonaId(null); // Resetear selección si vuelve a escribir
                            }}
                        />
                        {isDropdownOpen && searchPersona.trim().length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                            {personas
                              .filter((persona) => {
                                const search = searchPersona.toLowerCase().trim();
                                if(searchPersona.includes(" - DNI: ")) return true;
                                
                                const nombreCompleto = `${persona.nombre} ${persona.apellido}`.toLowerCase();
                                return nombreCompleto.includes(search) || 
                                       persona.dni?.toLowerCase().includes(search);
                              })
                              .map((persona) => (
                                <div
                                  key={persona.id}
                                  onClick={() => {
                                    setSelectedPersonaId(persona.id);
                                    setSearchPersona(`${persona.nombre} ${persona.apellido} - DNI: ${persona.dni}`);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                    selectedPersonaId === persona.id ? 'bg-gray-50' : ''
                                  }`}
                                >
                                  {selectedPersonaId === persona.id && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                  <span>
                                    {persona.nombre} {persona.apellido} - DNI: {persona.dni}
                                  </span>
                                </div>
                              ))}
                            {personas.filter((persona) => {
                              const search = searchPersona.toLowerCase().trim();
                              const nombreCompleto = `${persona.nombre} ${persona.apellido}`.toLowerCase();
                              return nombreCompleto.includes(search) || 
                                     persona.dni?.toLowerCase().includes(search);
                            }).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No se encontraron personas
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Deportes *</Label>
                      <div
                        className="border rounded-lg divide-y overflow-y-auto"
                        style={{ maxHeight: deportes.length > 4 ? 220 : undefined }}
                      >
                        {deportes.map((deporte) => (
                          <div
                            key={deporte.id}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-50"
                          >
                            <Checkbox
                              id={`deporte-${deporte.id}`}
                              checked={selectedDeportes.includes(deporte.id!)}
                              onCheckedChange={() => handleToggleDeporte(deporte.id!)}
                            />
                            <label
                              htmlFor={`deporte-${deporte.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium">{deporte.nombre}</div>
                              <div className="text-sm text-gray-500">
                                ${deporte.cuotaMensual.toLocaleString()}/mes
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedDeportes.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {selectedDeportes.length} deporte(s) seleccionado(s)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAssociateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAssociate}>
                      Asociar Deportes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Deporte
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingDeporte ? 'Editar Deporte' : 'Nuevo Deporte'}</DialogTitle>
                  <DialogDescription>Complete los datos del deporte o actividad</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Deporte *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value });
                        if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, nombre: false }));
                      }}
                      className={formErrors.nombre ? 'border-red-500 focus-visible:ring-red-500 bg-red-50' : ''}
                      required
                    />
                    {formErrors.nombre && (
                      <p className="text-xs text-red-600">Completa el nombre del deporte</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Input
                      id="descripcion"
                      value={formData.descripcion || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, descripcion: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cuotaEntrenador">Cuota Entrenador ($) *</Label>
                      <Input
                        id="cuotaEntrenador"
                        type="number"
                        value={formData.cuotaEntrenador === 0 ? '' : formData.cuotaEntrenador}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, cuotaEntrenador: value });
                          setFormErrors(prev => ({ ...prev, cuotaEntrenador: false }));
                        }}
                        required
                        min="0"
                        step="0.01"
                        className={formErrors.cuotaEntrenador ? 'border-red-500 focus-visible:ring-red-500 bg-red-50' : ''}
                      />
                      {formErrors.cuotaEntrenador && (
                        <p className="text-xs text-red-600">Ingresa la cuota de entrenador</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cuotaSeguro">Cuota Seguro ($) *</Label>
                      <Input
                        id="cuotaSeguro"
                        type="number"
                        value={formData.cuotaSeguro === 0 ? '' : formData.cuotaSeguro}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, cuotaSeguro: value });
                          setFormErrors(prev => ({ ...prev, cuotaSeguro: false }));
                        }}
                        required
                        min="0"
                        step="0.01"
                        className={formErrors.cuotaSeguro ? 'border-red-500 focus-visible:ring-red-500 bg-red-50' : ''}
                      />
                      {formErrors.cuotaSeguro && (
                        <p className="text-xs text-red-600">Ingresa la cuota de seguro</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cuotaSocial">Cuota Social ($) *</Label>
                      <Input
                        id="cuotaSocial"
                        type="number"
                        value={formData.cuotaSocial === 0 ? '' : formData.cuotaSocial}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, cuotaSocial: value });
                          setFormErrors(prev => ({ ...prev, cuotaSocial: false }));
                        }}
                        required
                        min="0"
                        step="0.01"
                        className={formErrors.cuotaSocial ? 'border-red-500 focus-visible:ring-red-500 bg-red-50' : ''}
                      />
                      {formErrors.cuotaSocial && (
                        <p className="text-xs text-red-600">Ingresa la cuota social</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Total Cuota Mensual (suma)</Label>
                      <div className="p-3 rounded-md border bg-gray-50 font-semibold">
                        ${totalCuota.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingDeporte ? 'Guardar Cambios' : 'Registrar Deporte'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!Array.isArray(deportes) || deportes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay deportes registrados</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deporte</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cuota Mensual</TableHead>
                    <TableHead>Socios</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(deportes)
                    ? deportes.map((deporte) => (
                    <TableRow key={deporte.id}>
                      <TableCell className="font-medium">{deporte.nombre}</TableCell>
                      <TableCell className="max-w-xs">
                        {deporte.descripcion || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          {(deporte.cuotaMensual ?? 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-4 h-4 text-blue-600" />
                          {deporte.numeroSocios ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(deporte)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {userRole === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deporte.id && handleDelete(deporte.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                    : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}