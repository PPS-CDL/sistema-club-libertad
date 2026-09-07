import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Plus, Edit, Trash2, Tag, Percent } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Textarea } from './ui/textarea';
import promocionService from '../services/promocionService';
import type { Promocion } from '../types/promocion';

interface PromocionesModuleProps {
  userRole: 'admin' | 'secretario';
}

export function PromocionesModule({ userRole }: PromocionesModuleProps) {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromocion, setEditingPromocion] = useState<Promocion | null>(null);
  const [formData, setFormData] = useState<Partial<Promocion>>({
    tipoDescuento: 'PORCENTAJE',
    activo: true,
  });
  const [formErrors, setFormErrors] = useState<{ nombre: boolean; descuento: boolean }>({
    nombre: false,
    descuento: false,
  });

  // Cargar promociones del backend
  useEffect(() => {
    const cargarPromociones = async () => {
      try {
        setLoading(true);
        const response = await promocionService.getAll();
        const data = Array.isArray(response.data) ? response.data : [];
        setPromociones(data);
      } catch (error) {
        console.error('Error al cargar promociones:', error);
        toast.error('Error al cargar las promociones');
      } finally {
        setLoading(false);
      }
    };
    cargarPromociones();
  }, []);

  const handleOpenDialog = (promocion?: Promocion) => {
    if (promocion) {
      setEditingPromocion(promocion);
      setFormData({
        nombre: promocion.nombre,
        descripcion: promocion.descripcion,
        tipoDescuento: promocion.tipoDescuento,
        descuento: promocion.descuento,
        activo: promocion.activo,
      });
    } else {
      setEditingPromocion(null);
      setFormData({
        tipoDescuento: 'PORCENTAJE',
        activo: true,
      });
    }
    setFormErrors({ nombre: false, descuento: false });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const errors = {
      nombre: !(formData.nombre && formData.nombre.trim().length > 0),
      descuento: !formData.descuento || formData.descuento <= 0,
    };

    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    if (formData.tipoDescuento === 'PORCENTAJE' && formData.descuento! > 100) {
      toast.error('El descuento porcentual no puede ser mayor al 100%');
      return;
    }

    try {
      const promocionData = {
        nombre: formData.nombre || '',
        descripcion: formData.descripcion || '',
        tipoDescuento: formData.tipoDescuento || 'PORCENTAJE',
        descuento: formData.descuento || 0,
        activo: formData.activo !== undefined ? formData.activo : true,
      };

      if (editingPromocion && editingPromocion.id) {
        await promocionService.update(editingPromocion.id, promocionData);
        toast.success('Promoción actualizada correctamente');
      } else {
        await promocionService.create(promocionData);
        toast.success('Promoción creada correctamente');
      }

      // Recargar lista
      const response = await promocionService.getAll();
      setPromociones(Array.isArray(response.data) ? response.data : []);

      setIsDialogOpen(false);
      setFormData({ tipoDescuento: 'PORCENTAJE', activo: true });
    } catch (error) {
      console.error('Error al guardar promoción:', error);
      toast.error(editingPromocion ? 'Error al actualizar promoción' : 'Error al crear promoción');
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (userRole !== 'admin') {
      toast.error('No tienes permisos para eliminar promociones');
      return;
    }
    if (confirm('¿Estás seguro de que deseas eliminar esta promoción?')) {
      try {
        await promocionService.delete(id);
        setPromociones(promociones.filter(p => p.id !== id));
        toast.success('Promoción eliminada correctamente');
      } catch (error) {
        console.error('Error al eliminar promoción:', error);
        toast.error('Error al eliminar promoción');
      }
    }
  };

  const handleToggleActiva = async (id: number | undefined) => {
    if (!id) return;
    const promocion = promociones.find(p => p.id === id);
    if (!promocion) return;

    try {
      await promocionService.update(id, { activo: !promocion.activo });
      setPromociones(promociones.map(p =>
        p.id === id ? { ...p, activo: !p.activo } : p
      ));
      toast.success('Estado de promoción actualizado');
    } catch (error) {
      console.error('Error al actualizar promoción:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const promocionesActivas = promociones.filter(p => p.activo).length;
  const promocionesInactivas = promociones.filter(p => !p.activo).length;

  if (loading) return <div>Cargando promociones...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Promociones</CardDescription>
            <CardTitle>{promociones.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              Promociones Activas
            </CardDescription>
            <CardTitle className="text-green-600">{promocionesActivas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Promociones Inactivas</CardDescription>
            <CardTitle className="text-gray-500">{promocionesInactivas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Promociones</CardTitle>
              <CardDescription>
                Crea y administra promociones personalizadas para aplicar a las cuotas
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Promoción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromocion ? 'Editar Promoción' : 'Nueva Promoción'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure los detalles de la promoción
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre de la Promoción *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, nombre: e.target.value });
                          if (e.target.value.trim().length > 0) setFormErrors(prev => ({ ...prev, nombre: false }));
                        }}
                        className={formErrors.nombre ? 'border-red-500 focus-visible:ring-red-500 bg-red-50' : ''}
                        placeholder="Ej: Multi-deporte, Familiar, Estudiante"
                      />
                      {formErrors.nombre && (
                        <p className="text-xs text-red-600">Completa el nombre de la promoción</p>
                      )}
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción *</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion || ''}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Describe las condiciones de la promoción"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Descuento *</Label>
                      <select
                        id="tipo"
                        value={formData.tipoDescuento || 'PORCENTAJE'}
                        onChange={(e) => setFormData({ ...formData, tipoDescuento: e.target.value as 'PORCENTAJE' | 'MONTO_FIJO' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="PORCENTAJE">Porcentaje (%)</option>
                        <option value="MONTO_FIJO">Monto Fijo ($)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descuento">
                        {formData.tipoDescuento === 'PORCENTAJE' ? 'Descuento (%) *' : 'Descuento ($) *'}
                      </Label>
                      <Input
                        id="descuento"
                        type="number"
                        value={formData.descuento === 0 ? '' : formData.descuento || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, descuento: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 });
                          if (e.target.value !== '' && parseFloat(e.target.value) > 0) setFormErrors(prev => ({ ...prev, descuento: false }));
                        }}
                        className={formErrors.descuento ? 'border-red-500 focus-visible:ring-red-500 bg-red-50' : ''}
                        placeholder={formData.tipoDescuento === 'PORCENTAJE' ? 'Ej: 10' : 'Ej: 2000'}
                        min="0"
                        max={formData.tipoDescuento === 'PORCENTAJE' ? 100 : undefined}
                      />
                      {formErrors.descuento && (
                        <p className="text-xs text-red-600">El descuento debe ser mayor a 0</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="activa"
                      checked={formData.activo || false}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="activa" className="cursor-pointer">
                      Promoción activa
                    </label>
                  </div>

                  {formData.descuento && formData.descuento > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm">
                        <strong>Vista previa:</strong> Esta promoción aplicará un descuento de{' '}
                        {formData.tipoDescuento === 'PORCENTAJE' 
                          ? `${formData.descuento}%`
                          : `$${formData.descuento}`
                        } sobre el monto total.
                      </p>
                      {formData.tipoDescuento === 'PORCENTAJE' && (
                        <p className="text-sm text-gray-600 mt-1">
                          Ejemplo: En una cuota de $10,000 se descontarían ${(10000 * formData.descuento / 100).toLocaleString()}, 
                          quedando en ${(10000 - (10000 * formData.descuento / 100)).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingPromocion ? 'Guardar Cambios' : 'Crear Promoción'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                {promociones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No hay promociones creadas
                    </TableCell>
                  </TableRow>
                ) : (
                  promociones.map((promocion) => (
                    <TableRow key={promocion.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-600" />
                          <span>{promocion.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">{promocion.descripcion || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {promocion.tipoDescuento === 'PORCENTAJE' 
                            ? `${promocion.descuento}%`
                            : `$${promocion.descuento}`
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={promocion.activo ? 'default' : 'secondary'}>
                          {promocion.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActiva(promocion.id)}
                          >
                            {promocion.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(promocion)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {userRole === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(promocion.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
