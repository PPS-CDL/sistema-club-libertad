import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { KeyRound, LogOut, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import usuarioService from '../services/usuarioService';

interface PerfilModuleProps {
  user: { id: string; name: string; role: 'admin' | 'secretario' };
  onLogout: () => void;
}

export function PerfilModule({ user, onLogout }: PerfilModuleProps) {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La nueva contraseña y la confirmación no coinciden');
      return;
    }
    try {
      await usuarioService.changePassword(Number(user.id), currentPassword, newPassword);
      toast.success('Contraseña actualizada correctamente');
      setIsPasswordDialogOpen(false);
      resetPasswordForm();
    } catch (error: any) {
      const message = error?.response?.data;
      setPasswordError(typeof message === 'string' && message.trim().length > 0
        ? message
        : 'No se pudo actualizar la contraseña');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Mi Perfil
          </CardTitle>
          <CardDescription>Información básica de la cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Usuario</div>
            <div className="text-base font-semibold">{user.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Rol</div>
            <div className="text-base font-semibold">
              {user.role === 'admin' ? 'Administrador' : 'Secretario'}
            </div>
          </div>
          <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
            setIsPasswordDialogOpen(open);
            if (!open) resetPasswordForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <KeyRound className="w-4 h-4 mr-2" />
                Cambiar Contraseña
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogDescription>
                  Ingresa tu contraseña actual y la nueva contraseña.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleChangePassword}>
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={onLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
