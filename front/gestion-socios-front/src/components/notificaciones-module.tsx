import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Mail, Send, Clock, CheckCircle2, AlertTriangle} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';

interface Notificacion {
  id: string;
  fecha: string;
  tipo: 'email';
  destinatarios: number;
  asunto: string;
  mensaje: string;
  estado: 'enviado' | 'programado' | 'fallido';
}

interface NotificacionesModuleProps {
  userRole: 'admin' | 'secretario';
}

export function NotificacionesModule({ userRole }: NotificacionesModuleProps) {

  const[showDevAlert, setShowDevAlert] = useState(false);

  useEffect(() => {
    setShowDevAlert(true);
  }, []);

  const placeholderMessage = 'Este módulo no es funcional y solo está como placeholder para futuras funciones.';
  const [historial, setHistorial] = useState<Notificacion[]>([
    {
      id: '1',
      fecha: '2025-11-01 10:30',
      tipo: 'email',
      destinatarios: 45,
      asunto: 'Recordatorio de Pago - Noviembre 2025',
      mensaje: 'Le recordamos que su cuota del mes de noviembre vence el día 10...',
      estado: 'enviado',
    },
    {
      id: '2',
      fecha: '2025-11-05 14:20',
      tipo: 'email',
      destinatarios: 12,
      asunto: 'Aviso de Deuda Vencida',
      mensaje: 'Estimado socio, detectamos que tiene cuotas vencidas...',
      estado: 'enviado',
    },
  ]);

  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState<string[]>([]);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviarInmediato, setEnviarInmediato] = useState(true);

  const gruposDestinatarios = [
    { id: 'todos', nombre: 'Todos los socios', cantidad: 75 },
    { id: 'morosos', nombre: 'Socios con pagos pendientes', cantidad: 12 },
    { id: 'vencidos', nombre: 'Socios con pagos vencidos', cantidad: 5 },
    { id: 'futbol', nombre: 'Socios de Fútbol', cantidad: 45 },
    { id: 'tenis', nombre: 'Socios de Tenis', cantidad: 32 },
    { id: 'natacion', nombre: 'Socios de Natación', cantidad: 56 },
  ];

  const plantillas = [
    {
      id: '1',
      nombre: 'Recordatorio de Pago',
      asunto: 'Recordatorio de Pago - [MES] [AÑO]',
      mensaje: `Estimado/a [NOMBRE],

Le recordamos que su cuota correspondiente al mes de [MES] [AÑO] vence el día [FECHA_VENCIMIENTO].

Monto a abonar: $[MONTO]

Para cualquier consulta, no dude en contactarnos.

Saludos cordiales,
Club Deportivo`,
    },
    {
      id: '2',
      nombre: 'Aviso de Deuda Vencida',
      asunto: 'Aviso Importante - Cuota Vencida',
      mensaje: `Estimado/a [NOMBRE],

Detectamos que tiene cuotas vencidas pendientes de pago.

Monto adeudado: $[MONTO]
Período: [PERIODO]

Le solicitamos regularizar su situación a la brevedad.

Saludos cordiales,
Club Deportivo`,
    },
  ];

  const handleEnviarNotificacion = () => {
    if (destinatariosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un grupo de destinatarios');
      return;
    }

    if (!asunto || !mensaje) {
      toast.error('Complete el asunto y mensaje');
      return;
    }

    const cantidadDestinatarios = gruposDestinatarios
      .filter(g => destinatariosSeleccionados.includes(g.id))
      .reduce((sum, g) => sum + g.cantidad, 0);

    const nuevaNotificacion: Notificacion = {
      id: Date.now().toString(),
      fecha: new Date().toLocaleString('es-AR'),
      tipo: 'email',
      destinatarios: cantidadDestinatarios,
      asunto,
      mensaje,
      estado: enviarInmediato ? 'enviado' : 'programado',
    };

    setHistorial([nuevaNotificacion, ...historial]);
    
    if (enviarInmediato) {
      toast.success(`Notificaciones enviadas correctamente a ${cantidadDestinatarios} destinatarios`);
    } else {
      toast.success('Notificación programada correctamente');
    }

    // Reset form
    setDestinatariosSeleccionados([]);
    setAsunto('');
    setMensaje('');
  };

  const cargarPlantilla = (plantillaId: string) => {
    const plantilla = plantillas.find(p => p.id === plantillaId);
    if (plantilla) {
      setAsunto(plantilla.asunto);
      setMensaje(plantilla.mensaje);
      toast.success('Plantilla cargada');
    }
  };

  const totalDestinatarios = gruposDestinatarios
    .filter(g => destinatariosSeleccionados.includes(g.id))
    .reduce((sum, g) => sum + g.cantidad, 0);

  return (

    <div className="space-y-6">

      <div className="text-sm text-red-600 font-medium">
        {placeholderMessage}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Emails Enviados
            </CardDescription>
            <CardTitle>
              {historial.filter(n => n.tipo === 'email' && n.estado === 'enviado').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Programados
            </CardDescription>
            <CardTitle>
              {historial.filter(n => n.estado === 'programado').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de envío */}
        <Card>
          <CardHeader>
            <CardTitle>Enviar Notificación</CardTitle>
            <CardDescription>Configure y envíe avisos a los socios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plantillas</Label>
              <Select onValueChange={cargarPlantilla}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {plantillas.map((plantilla) => (
                    <SelectItem key={plantilla.id} value={plantilla.id}>
                      {plantilla.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatarios</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {gruposDestinatarios.map((grupo) => (
                  <div key={grupo.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`dest-${grupo.id}`}
                        checked={destinatariosSeleccionados.includes(grupo.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDestinatariosSeleccionados([...destinatariosSeleccionados, grupo.id]);
                          } else {
                            setDestinatariosSeleccionados(destinatariosSeleccionados.filter(id => id !== grupo.id));
                          }
                        }}
                      />
                      <label htmlFor={`dest-${grupo.id}`} className="cursor-pointer">
                        {grupo.nombre}
                      </label>
                    </div>
                    <Badge variant="secondary">{grupo.cantidad}</Badge>
                  </div>
                ))}
              </div>
              {totalDestinatarios > 0 && (
                <p className="text-sm text-gray-600">
                  Total destinatarios: <span className="font-semibold">{totalDestinatarios}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="asunto">Asunto *</Label>
              <Input
                id="asunto"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej: Recordatorio de Pago"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje *</Label>
              <Textarea
                id="mensaje"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escriba el mensaje..."
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Variables disponibles: [NOMBRE], [MES], [AÑO], [MONTO], [FECHA_VENCIMIENTO], [PERIODO]
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inmediato"
                checked={enviarInmediato}
                onCheckedChange={(checked) => setEnviarInmediato(checked as boolean)}
              />
              <label htmlFor="inmediato" className="cursor-pointer">
                Enviar inmediatamente
              </label>
            </div>

            <Button className="w-full" onClick={handleEnviarNotificacion}>
              <Send className="w-4 h-4 mr-2" />
              {enviarInmediato ? 'Enviar Notificación' : 'Programar Notificación'}
            </Button>
          </CardContent>
        </Card>

        {/* Historial */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Notificaciones</CardTitle>
            <CardDescription>Últimas notificaciones enviadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {historial.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay notificaciones enviadas</p>
              ) : (
                historial.map((notif) => (
                  <div key={notif.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm">{notif.asunto}</div>
                          <div className="text-xs text-gray-500">{notif.fecha}</div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          notif.estado === 'enviado'
                            ? 'default'
                            : notif.estado === 'programado'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {notif.estado === 'enviado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {notif.estado === 'programado' && <Clock className="w-3 h-3 mr-1" />}
                        {notif.estado}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{notif.mensaje}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Destinatarios: {notif.destinatarios}</span>
                      <span className="capitalize">{notif.tipo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Advertencia de Desarrollo */}
      <Dialog open={showDevAlert} onOpenChange={setShowDevAlert}>
        <DialogContent className="sm:max-w-[425px] border-amber-200">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <DialogTitle className="text-amber-800">Módulo en Desarrollo</DialogTitle>
            </div>
            <DialogDescription className="text-base text-gray-600 pt-2">
              Esta sección del sistema aún se encuentra en **fase de desarrollo**.
              <br /><br />
              Las interfaces son representativas y la funcionalidad de envío de correos electrónicos **no está operativa** en este momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
              onClick={() => setShowDevAlert(false)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
