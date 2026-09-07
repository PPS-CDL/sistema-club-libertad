import { useEffect, useRef, useState } from 'react';
import { Users, Activity, DollarSign, Settings, Bell, Tag, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { SociosModule } from './components/socios-module';
import { DeportesModule } from './components/deportes-module';
import { PagosModule } from './components/pagos-module';
import { AdminModule } from './components/admin-module';
import { NotificacionesModule } from './components/notificaciones-module';
import { PromocionesModule } from './components/promociones-module';
import { LoginScreen } from './components/login-screen';
import { PerfilModule } from './components/perfil-module';
import authService from './services/authService';
import { Toaster } from 'sonner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: 'admin' | 'secretario';
  } | null>(null);
  const [activeTab, setActiveTab] = useState('socios');
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const sessionTimerRef = useRef<number | null>(null);
  const sessionExpireRef = useRef<number | null>(null);

  const handleLogin = (user: { id: string; name: string; role: 'admin' | 'secretario' }) => {
    setCurrentUser(user);
    const expiresAtRaw = localStorage.getItem('authExpiresAt');
    if (expiresAtRaw) {
      const expiresAt = Number(expiresAtRaw);
      if (!Number.isNaN(expiresAt)) {
        scheduleSessionPrompt(expiresAt);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authExpiresAt');
    setCurrentUser(null);
  };

  const clearSessionTimer = () => {
    if (sessionTimerRef.current !== null) {
      window.clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (sessionExpireRef.current !== null) {
      window.clearTimeout(sessionExpireRef.current);
      sessionExpireRef.current = null;
    }
  };

  const scheduleSessionPrompt = (expiresAt: number) => {
    clearSessionTimer();
    const now = Date.now();
    const warnAt = Math.max(expiresAt - 60_000, now);
    const delay = Math.max(warnAt - now, 0);
    sessionTimerRef.current = window.setTimeout(() => {
      setIsSessionDialogOpen(true);
    }, delay);
    const expireDelay = Math.max(expiresAt - now, 0);
    sessionExpireRef.current = window.setTimeout(() => {
      setIsSessionDialogOpen(false);
      handleLogout();
    }, expireDelay);
  };

  const handleExtendSession = async () => {
    try {
      const res = await authService.refresh();
      const data = res.data;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authExpiresAt', String(Date.now() + data.expiresInMillis));
      setIsSessionDialogOpen(false);
      scheduleSessionPrompt(Date.now() + data.expiresInMillis);
    } catch {
      handleLogout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userRaw = localStorage.getItem('authUser');
    const expiresAtRaw = localStorage.getItem('authExpiresAt');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
        if (expiresAt && Date.now() > expiresAt) {
          handleLogout();
          return;
        }
        if (user?.id && user?.name && user?.role) {
          setCurrentUser(user);
          if (expiresAt) {
            scheduleSessionPrompt(expiresAt);
          }
        }
      } catch {
        localStorage.removeItem('authUser');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      clearSessionTimer();
    };
  }, []);

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sesión por expirar</DialogTitle>
            <DialogDescription>
              Tu sesión está por finalizar. ¿Quieres extender la sesión actual?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleLogout}>Cancelar</Button>
            <Button onClick={handleExtendSession}>Aceptar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-gray-900">Sistema de Gestión - Club Deportivo</h1>
              <p className="text-gray-500 text-sm">
                {currentUser.name} • {currentUser.role === 'admin' ? 'Administrador' : 'Secretario'}
              </p>
            </div>
            <Button variant="outline" onClick={() => setActiveTab('perfil')}>
              Mi Perfil
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="socios" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Socios</span>
            </TabsTrigger>
            <TabsTrigger value="deportes" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Deportes</span>
            </TabsTrigger>
            <TabsTrigger value="promociones" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Promociones</span>
            </TabsTrigger>
            <TabsTrigger value="pagos" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            {currentUser.role === 'admin' && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="socios">
            <SociosModule userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="deportes">
            <DeportesModule userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="promociones">
            <PromocionesModule userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="pagos">
            <PagosModule userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="notificaciones">
            <NotificacionesModule userRole={currentUser.role} />
          </TabsContent>

          <TabsContent value="perfil">
            <PerfilModule user={currentUser} onLogout={handleLogout} />
          </TabsContent>

          {currentUser.role === 'admin' && (
            <TabsContent value="admin">
              <AdminModule />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Toaster position="bottom-left" richColors closeBUtton />
    </div>
  );
}
