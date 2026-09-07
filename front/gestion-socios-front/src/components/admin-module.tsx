import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Shield, UserPlus, Download, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import backupService, { BackupInfo } from '../services/backupService';
import usuarioService from '../services/usuarioService';
import personaService from '../services/personaService';
import deporteService from '../services/deporteService';
import { Usuario as UsuarioApi } from '../types/usuario';
import api from '../services/api';

interface Usuario {
  id: number;
  nombre: string;
  email?: string | null;
  rol: 'admin' | 'secretario';
  estado: 'activo' | 'inactivo';
  ultimoAcceso: string;
}

interface FormUsuario {
  nombre: string;
  email: string;
  rol: 'admin' | 'secretario';
}

interface UsuarioCreado {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'SECRETARIO';
  passwordTemporal: string;
}

interface BackupRow {
  fileName: string;
  createdAt: string;
  size: string;
  estado: 'completado' | 'en_proceso' | 'fallido';
}

export function AdminModule() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [backups, setBackups] = useState<BackupRow[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormUsuario>({
    nombre: '',
    email: '',
    rol: 'secretario',
  });
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<UsuarioCreado | null>(null);
  const [isCreatedDialogOpen, setIsCreatedDialogOpen] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState<{ nombre?: string; email?: string }>({});
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [totalSocios, setTotalSocios] = useState(0);
  const [totalDeportes, setTotalDeportes] = useState(0);

  const handleCrearUsuario = async () => {
    if (!formData.nombre.trim() || !formData.email.trim()) {
      toast.error('Completa usuario y email');
      return;
    }
    setUserFormErrors({});
    try {
      const res = await usuarioService.create({
        username: formData.nombre.trim(),
        email: formData.email.trim(),
        role: formData.rol === 'admin' ? 'ADMIN' : 'SECRETARIO',
      });
      setCreatedUser(res.data as UsuarioCreado);
      setIsCreatedDialogOpen(true);
      toast.success('Usuario creado correctamente');
      setIsDialogOpen(false);
      setFormData({ nombre: '', email: '', rol: 'secretario' });
      await cargarUsuarios();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      const message = (error as any)?.response?.data;
      if (typeof message === 'string') {
        const lower = message.toLowerCase();
        setUserFormErrors({
          nombre: lower.includes('usuario') ? 'Ya hay un usuario registrado con este nombre' : undefined,
          email: lower.includes('correo') || lower.includes('email') ? 'Ya hay un usuario registrado con este correo' : undefined,
        });
        return;
      }
      toast.error('No se pudo crear el usuario');
    }
  };

  const handleCambiarEstado = async (id: number) => {
    try {
      await usuarioService.toggleEstado(id);
      toast.success('Estado actualizado');
      await cargarUsuarios();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('No se pudo actualizar el estado');
    }
  };

  const handleDeleteUsuario = (usuario: Usuario) => {
    setUserToDelete(usuario);
    setIsDeleteUserDialogOpen(true);
  };

  const handleConfirmDeleteUsuario = async () => {
    if (!userToDelete) return;
    try {
      await usuarioService.delete(userToDelete.id);
      toast.success('Usuario eliminado correctamente');
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
      await cargarUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      toast.error('No se pudo eliminar el usuario');
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await usuarioService.getAll();
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped: Usuario[] = (data as UsuarioApi[]).map(u => ({
        id: u.id,
        nombre: u.username,
        email: u.email ?? null,
        rol: u.role.toLowerCase() as 'admin' | 'secretario',
        estado: u.activo ? 'activo' : 'inactivo',
        ultimoAcceso: u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString() : '-',
      }));
      setUsuarios(mapped);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('No se pudieron cargar los usuarios');
    }
  };

  const cargarBackups = async () => {
    try {
      const res = await backupService.list();
      const data = Array.isArray(res.data) ? res.data : [];
      const rows: BackupRow[] = data.map((b: BackupInfo) => ({
        fileName: b.fileName,
        createdAt: b.createdAt?.split(' ')[0] || b.createdAt,
        size: `${(b.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        estado: 'completado',
      }));
      setBackups(rows);
    } catch (error) {
      console.error('Error al cargar backups:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const [personasRes, deportesRes] = await Promise.all([
        personaService.getAll(),
        deporteService.getAll(),
      ]);
      const personas = Array.isArray(personasRes.data) ? personasRes.data : [];
      const deportes = Array.isArray(deportesRes.data) ? deportesRes.data : [];
      setTotalSocios(personas.length);
      setTotalDeportes(deportes.length);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  useEffect(() => {
    cargarBackups();
    cargarUsuarios();
    cargarEstadisticas();
  }, []);

  const handleCrearBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupProgress(20);
      await backupService.create();
      setBackupProgress(100);
      setIsBackingUp(false);
      toast.success('Backup creado correctamente');
      cargarBackups();
    } catch (error) {
      setIsBackingUp(false);
      toast.error('Error al crear backup');
      console.error(error);
    }
  };

  const handleDescargarBackup = async (backup: BackupRow) => {
    try {
      const baseUrl = api.defaults.baseURL || 'http://localhost:8080';
      const url = `${baseUrl}${backupService.downloadUrl(backup.fileName)}`;
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = backup.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Error al descargar backup:', error);
      toast.error('No se pudo descargar el backup');
    }
  };

  const handleRestaurarBackup = async (backup: BackupRow) => {
    const confirmed = confirm('¿Está seguro que desea restaurar este backup? Se perderán los datos actuales.');
    if (!confirmed) return;
    try {
      setRestoringFile(backup.fileName);
      await backupService.restore(backup.fileName);
      toast.success('Backup restaurado correctamente');
    } catch (error) {
      console.error('Error al restaurar backup:', error);
      toast.error('No se pudo restaurar el backup');
    } finally {
      setRestoringFile(null);
    }
  };

  const getProximoBackup = () => {
    const now = new Date();
    let next = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    if (now >= next) {
      next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    }
    return next.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Panel de Administración</AlertTitle>
        <AlertDescription>
          Este módulo solo está disponible para usuarios con rol de Administrador. Tenga cuidado al realizar cambios en la configuración del sistema.
        </AlertDescription>
      </Alert>

      {/* Usuarios */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administrar usuarios y permisos del sistema</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    El usuario recibirá una contraseña temporal por email
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Username *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value });
                        if (userFormErrors.nombre) {
                          setUserFormErrors(prev => ({ ...prev, nombre: undefined }));
                        }
                      }}
                    />
                    {userFormErrors.nombre && (
                      <p className="text-xs text-red-600">{userFormErrors.nombre}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (userFormErrors.email) {
                          setUserFormErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                    />
                    {userFormErrors.email && (
                      <p className="text-xs text-red-600">{userFormErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rol">Rol *</Label>
                    <Select
                      value={formData.rol}
                      onValueChange={(value) => setFormData({ ...formData, rol: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="secretario">Secretario</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      • Administrador: Control total del sistema<br />
                      • Secretario: Registro y visualización (sin eliminación)
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCrearUsuario}>
                    Crear Usuario
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Eliminar Usuario</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas eliminar a {userToDelete?.nombre}?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmDeleteUsuario}>
                    Eliminar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreatedDialogOpen} onOpenChange={setIsCreatedDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Usuario creado correctamente</DialogTitle>
                  <DialogDescription>
                    Guarda estos datos. La contraseña es temporal.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">Usuario:</span> {createdUser?.username || '-'}</div>
                  <div><span className="font-semibold">Email:</span> {createdUser?.email || '-'}</div>
                  <div><span className="font-semibold">Rol:</span> {createdUser?.role || '-'}</div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <span className="font-semibold">Contraseña temporal:</span>
                    <div className="mt-1 font-mono text-base">{createdUser?.passwordTemporal || '-'}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreatedDialogOpen(false)}>
                    Cerrar
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
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>{usuario.nombre}</TableCell>
                    <TableCell>{usuario.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={usuario.rol === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="w-3 h-3 mr-1" />
                        {usuario.rol === 'admin' ? 'Administrador' : 'Secretario'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.estado === 'activo' ? 'default' : 'secondary'}>
                        {usuario.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCambiarEstado(usuario.id)}
                      >
                        {usuario.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleDeleteUsuario(usuario)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Backups */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Copias de Seguridad</CardTitle>
              <CardDescription>
                Sistema de backups manuales. Los archivos se generan con pg_dump y se listan aquí.
              </CardDescription>
            </div>
            <Button onClick={handleCrearBackup} disabled={isBackingUp}>
              <Database className="w-4 h-4 mr-2" />
              {isBackingUp ? 'Creando Backup...' : 'Crear Backup Manual'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBackingUp && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Creando copia de seguridad...</span>
                <span>{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} />
            </div>
          )}

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.fileName}>
                    <TableCell>{backup.createdAt}</TableCell>
                    <TableCell>{backup.size}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          backup.estado === 'completado'
                            ? 'default'
                            : backup.estado === 'en_proceso'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {backup.estado === 'completado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {backup.estado === 'fallido' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {backup.estado === 'completado' && 'Completado'}
                        {backup.estado === 'en_proceso' && 'En Proceso'}
                        {backup.estado === 'fallido' && 'Fallido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDescargarBackup(backup)}
                          disabled={backup.estado !== 'completado'}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestaurarBackup(backup)}
                          disabled={backup.estado !== 'completado' || restoringFile === backup.fileName || isBackingUp}
                        >
                          {restoringFile === backup.fileName ? 'Restaurando...' : 'Restaurar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Backup Automático</AlertTitle>
            <AlertDescription>
              El sistema crea automáticamente una copia de seguridad el primer día de cada mes a las 00:00.
              Se mantienen los últimos 6 backups, eliminando los más antiguos automáticamente.
              Próximo backup automático: <strong>{getProximoBackup()}</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Estadísticas del Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Socios</CardDescription>
            <CardTitle>{totalSocios}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Deportes Activos</CardDescription>
            <CardTitle>{totalDeportes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usuarios del Sistema</CardDescription>
            <CardTitle>{usuarios.filter(u => u.estado === 'activo').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
