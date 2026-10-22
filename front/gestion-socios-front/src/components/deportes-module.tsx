import { Fragment, useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Users as UsersIcon,
  DollarSign,
  UserPlus,
  UserMinus,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import deporteService from "../services/deporteService";
import configuracionClubService from "../services/configuracionClubService";
import personaService from "../services/personaService";
import inscripcionService from "../services/inscripcionService";
import type { Deporte, EstadoPagosDeporteDTO } from "../types/deporte";
import type { Persona } from "../types/persona";

interface DeportesModuleProps {
  userRole: "admin" | "secretario";
}

// Subcomponente Panel Desplegable de Estado de Pagos
function DeporteEstadoPagosPanel({ deporte }: { deporte: Deporte }) {
  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  const [periodo, setPeriodo] = useState<string>(periodoActual);
  const [data, setData] = useState<EstadoPagosDeporteDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados para buscador con debounce
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Cargar datos de pagos al cambiar el período o el deporte
  useEffect(() => {
    let isMounted = true;
    if (!deporte.id) return;

    setLoading(true);
    deporteService
      .getEstadoPagos(deporte.id, periodo)
      .then((res) => {
        if (isMounted && res?.data) {
          setData(res.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Error al obtener el estado de pagos del deporte");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [deporte.id, periodo]);

  // Debounce de 400ms para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Función para normalizar texto (quitar tildes y mayúsculas)
  const normalizeStr = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // Filtrado local de personas
  const personasFiltradas = useMemo(() => {
    if (!data?.personas) return [];
    if (!debouncedSearch.trim()) return data.personas;

    const queryNorm = normalizeStr(debouncedSearch.trim());
    return data.personas.filter((p) => {
      const nombreCompleto = normalizeStr(`${p.nombre} ${p.apellido}`);
      return nombreCompleto.includes(queryNorm) || p.dni.includes(queryNorm);
    });
  }, [data, debouncedSearch]);

  // Exportación CSV
  const exportarCSVEstadoPagos = () => {
    if (!data || !data.personas || data.personas.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const colWidths = [35, 20, 20];
    const formatearFila = (cols: (string | number)[]) =>
      cols
        .map((col, idx) => {
          const str = String(col ?? "").trim();
          const width = colWidths[idx] || 20;
          return str.padEnd(width, " ");
        })
        .join(";");

    let lineas: string[] = [];
    lineas.push(formatearFila(["Nombre y apellido", "DNI", "Estado de pago"]));

    // Se exporta el listado completo independientemente de la búsqueda activa
    data.personas.forEach((p) => {
      lineas.push(
        formatearFila([`${p.nombre} ${p.apellido}`, p.dni, p.estado]),
      );
    });

    const contenidoCSV = "\uFEFF" + lineas.join("\n");
    const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const nombreDeporteClean = deporte.nombre
      .toLowerCase()
      .replace(/\s+/g, "_");
    a.download = `estado_pagos_${nombreDeporteClean}_${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo CSV descargado correctamente");
  };

  return (
    <div className="p-4 bg-gray-50/80 border-t border-b border-gray-200 space-y-4">
      {/* Cabecera del desplegable: Nombre del deporte, Selector, Buscador y Botón CSV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h4 className="font-semibold text-lg text-gray-800">
            {deporte.nombre}
          </h4>
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`periodo-${deporte.id}`}
              className="text-sm font-medium"
            >
              Período:
            </Label>
            <Input
              id={`periodo-${deporte.id}`}
              type="month"
              value={periodo}
              max={periodoActual}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-40 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <Input
              type="text"
              placeholder=" Buscar por nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={exportarCSVEstadoPagos}
            disabled={!data || data.personas.length === 0}
            className="whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar CSV
          </Button>
        </div>
      </div>

      {/* Contadores generales */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-medium">
              Inscriptos con cuota
            </p>
            <p className="text-xl font-bold text-gray-800">
              {data.totalInscriptos}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-200 bg-green-50/30 shadow-sm text-center">
            <p className="text-xs text-green-700 font-medium">Pagaron</p>
            <p className="text-xl font-bold text-green-600">{data.pagaron}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-red-200 bg-red-50/30 shadow-sm text-center">
            <p className="text-xs text-red-700 font-medium">Deben</p>
            <p className="text-xl font-bold text-red-600">{data.deben}</p>
          </div>
        </div>
      )}

      {/* Tabla de personas */}
      {loading ? (
        <p className="text-center text-sm text-gray-500 py-4">
          Cargando estado de pagos...
        </p>
      ) : personasFiltradas.length > 0 ? (
        <div className="border rounded-lg bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-100/70">
              <TableRow>
                <TableHead>Nombre y Apellido</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead className="text-right">Estado de Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personasFiltradas.map((persona) => (
                <TableRow key={persona.personaId}>
                  <TableCell className="font-medium">
                    {persona.nombre} {persona.apellido}
                  </TableCell>
                  <TableCell>{persona.dni}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        persona.estado === "PAGADA"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {persona.estado}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 py-6 bg-white border rounded-lg">
          {!data || data.personas.length === 0
            ? "No existen cuotas deportivas generadas para el período seleccionado."
            : "No se encontraron coincidencia para la búsqueda."}
        </p>
      )}
    </div>
  );
}

export function DeportesModule({ userRole }: DeportesModuleProps) {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [fechaEfectiva, setFechaEfectiva] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [isDeassociateDialogOpen, setIsDeassociateDialogOpen] = useState(false);
  const [editingDeporte, setEditingDeporte] = useState<Deporte | null>(null);
  const [formData, setFormData] = useState<{
    nombre: string;
    descripcion?: string;
    cuotaEntrenador: number;
    cuotaSeguro: number;
  }>({
    nombre: "",
    descripcion: "",
    cuotaEntrenador: 0,
    cuotaSeguro: 0,
  });
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [selectedDeportes, setSelectedDeportes] = useState<number[]>([]);
  const [searchPersona, setSearchPersona] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{
    nombre: boolean;
    cuotaEntrenador: boolean;
    cuotaSeguro: boolean;
  }>({
    nombre: false,
    cuotaEntrenador: false,
    cuotaSeguro: false,
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Estado para controlar qué deporte se encuentra desplegado
  const [expandedDeporteId, setExpandedDeporteId] = useState<number | null>(
    null,
  );

  const toggleExpandDeporte = (id: number) => {
    setExpandedDeporteId((prev) => (prev === id ? null : id));
  };

  const totalCuota =
    (formData.cuotaEntrenador ?? 0) + (formData.cuotaSeguro ?? 0);

  const hoy = new Date();
  const inicioPeriodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const mostrarPrecioDeportivoSeparado =
    fechaEfectiva !== null && inicioPeriodoActual >= fechaEfectiva;
  const obtenerCuotaMensualVigente = (deporte: Deporte) =>
    mostrarPrecioDeportivoSeparado
      ? (deporte.cuotaEntrenador ?? 0) + (deporte.cuotaSeguro ?? 0)
      : (deporte.cuotaMensual ?? 0);

  const deportesActivosDePersona = deportes.filter((deporte: Deporte) =>
    deporte.personasIds?.includes(selectedPersonaId),
  );

  // Cargar deportes desde el backend
  const loadDeportes = async () => {
    try {
      setLoading(true);
      const [response, configuracionResponse] = await Promise.all([
        deporteService.getAll(),
        configuracionClubService.get().catch(() => ({ data: null })),
      ]);
      const data = response?.data;
      setDeportes(Array.isArray(data) ? data : []);
      setFechaEfectiva(configuracionResponse?.data?.fechaEfectiva ?? null);
    } catch (error) {
      toast.error("Error al cargar los deportes");
      console.error("Error loading deportes:", error);
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
      console.error("Error loading personas:", error);
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
        descripcion: deporte.descripcion ?? "",
        cuotaEntrenador: deporte.cuotaEntrenador ?? 0,
        cuotaSeguro: deporte.cuotaSeguro ?? 0,
      });
    } else {
      setEditingDeporte(null);
      setFormData({
        nombre: "",
        descripcion: "",
        cuotaEntrenador: 0,
        cuotaSeguro: 0,
      });
    }
    setFormErrors({
      nombre: false,
      cuotaEntrenador: false,
      cuotaSeguro: false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const errors = {
      nombre: !(formData.nombre && formData.nombre.trim().length > 0),
      cuotaEntrenador:
        formData.cuotaEntrenador === null ||
        formData.cuotaEntrenador === undefined,
      cuotaSeguro:
        formData.cuotaSeguro === null || formData.cuotaSeguro === undefined,
    };

    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      cuotaEntrenador: formData.cuotaEntrenador,
      cuotaSeguro: formData.cuotaSeguro,
    };

    try {
      if (editingDeporte && editingDeporte.id) {
        await deporteService.update(editingDeporte.id, payload);
        toast.success("Deporte actualizado correctamente");
      } else {
        await deporteService.create({ ...payload, cuotaSocial: 0 });
        toast.success("Deporte registrado correctamente");
      }
      setIsDialogOpen(false);
      await loadDeportes(); // Recargar la lista
    } catch (error) {
      toast.error(
        editingDeporte
          ? "Error al actualizar el deporte"
          : "Error al crear el deporte",
      );
    }
  };

  const handleDelete = async (id: number) => {
    if (userRole !== "admin") {
      toast.error("No tienes permisos para eliminar deportes");
      return;
    }
    if (!confirm("¿Estás seguro de que deseas eliminar este deporte?")) return;

    try {
      await deporteService.delete(id);
      toast.success("Deporte eliminado correctamente");
      await loadDeportes();
    } catch (error) {
      toast.error("Error al eliminar el deporte");
    }
  };

  const handleOpenAssociateDialog = () => {
    setSelectedPersonaId("");
    setSelectedDeportes([]);
    setSearchPersona("");
    setIsDropdownOpen(false);
    setIsAssociateDialogOpen(true);
  };

  const handleOpenDeassociateDialog = () => {
    setSelectedPersonaId(null);
    setSelectedDeportes([]);
    setSearchPersona("");
    setIsDropdownOpen(false);
    setIsDeassociateDialogOpen(true);
  };

  const handleToggleDeporte = (deporteId: number) => {
    setSelectedDeportes((prev) =>
      prev.includes(deporteId)
        ? prev.filter((id) => id !== deporteId)
        : [...prev, deporteId],
    );
  };

  const handleAssociate = async () => {
    if (!selectedPersonaId || selectedDeportes.length === 0) {
      toast.error("Selecciona una persona y al menos un deporte");
      return;
    }

    try {
      const personaIdNum = parseInt(selectedPersonaId);

      // Asociar cada deporte seleccionado y crear la inscripción correspondiente
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      const fechaInscripcion = `${yyyy}-${mm}-${dd}`; // Formato YYYY-MM-DD

      for (const deporteId of selectedDeportes) {
        await personaService.asociarDeporte(personaIdNum, deporteId);
        await inscripcionService.create({
          personaId: personaIdNum,
          deporteId,
          fechaInscripcion,
        });
      }

      toast.success(
        `Persona asociada e inscripta a ${selectedDeportes.length} deporte(s) correctamente`,
      );
      setIsAssociateDialogOpen(false);
      await loadDeportes();
      await loadPersonas();
    } catch (error) {
      toast.error("Error al asociar e inscribir deportes");
      console.error("Error:", error);
    }
  };

  const handleDeassociate = async () => {
    if (!selectedPersonaId || selectedDeportes.length === 0) {
      toast.error("Selecciona una persona y al menos un deporte");
      return;
    }

    try {
      const personaIdNum = parseInt(selectedPersonaId);

      for (const deporteId of selectedDeportes) {
        await personaService.desasociarDeporte(personaIdNum, deporteId);
        await inscripcionService.darBaja(personaIdNum, deporteId);
      }

      toast.success(
        `Persona desasociada a ${selectedDeportes.length} deporte(s) correctamente`,
      );
      setIsDeassociateDialogOpen(false);
      await loadDeportes();
      await loadPersonas();
    } catch (error) {
      toast.error("Error al Desasociar e Desincribir deportes");
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Cargando deportes...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Deportes</CardDescription>
            <CardTitle>
              {Array.isArray(deportes) ? deportes.length : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ingresos Mensuales Potenciales</CardDescription>
            <CardTitle>
              $
              {Array.isArray(deportes)
                ? deportes
                    .reduce((sum, d) => {
                      const socios =
                        d.numeroSocios ?? d.personasIds?.length ?? 0;
                      return sum + obtenerCuotaMensualVigente(d) * socios;
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
              <CardDescription>
                Gestión de deportes ofrecidos por el club
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog
                open={isDeassociateDialogOpen}
                onOpenChange={setIsDeassociateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleOpenDeassociateDialog}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Desasociar Persona
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Desasociar Persona a Deportes</DialogTitle>
                    <DialogDescription>
                      Selecciona una persona y los deportes a los que deseas
                      desinscribirla
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
                          onFocus={() => setIsDropdownOpen(true)}
                          onChange={(e) => {
                            setSearchPersona(e.target.value);
                            setIsDropdownOpen(true);
                            if (selectedPersonaId) setSelectedPersonaId("");
                          }}
                        />
                        {isDropdownOpen && searchPersona.trim().length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                            {personas
                              .filter((persona) => {
                                const search = searchPersona
                                  .toLowerCase()
                                  .trim();
                                if (searchPersona.includes(" - DNI: "))
                                  return true;

                                const nombreCompleto =
                                  `${persona.nombre} ${persona.apellido}`.toLowerCase();
                                return (
                                  nombreCompleto.includes(search) ||
                                  persona.dni?.toLowerCase().includes(search)
                                );
                              })
                              .map((persona) => (
                                <div
                                  key={persona.id}
                                  onClick={() => {
                                    setSelectedPersonaId(persona.id);
                                    setSearchPersona(
                                      `${persona.nombre} ${persona.apellido} - DNI: ${persona.dni}`,
                                    );
                                    setIsDropdownOpen(false);
                                    setSelectedDeportes([]);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                    selectedPersonaId === persona.id
                                      ? "bg-gray-50"
                                      : ""
                                  }`}
                                >
                                  {selectedPersonaId === persona.id && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                  <span>
                                    {persona.nombre} {persona.apellido} - DNI:{" "}
                                    {persona.dni}
                                  </span>
                                </div>
                              ))}
                            {personas.filter((persona) => {
                              const search = searchPersona.toLowerCase().trim();
                              const nombreCompleto =
                                `${persona.nombre} ${persona.apellido}`.toLowerCase();
                              return (
                                nombreCompleto.includes(search) ||
                                persona.dni?.toLowerCase().includes(search)
                              );
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
                        style={{
                          maxHeight: deportes.length > 4 ? 220 : undefined,
                        }}
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
                                  checked={selectedDeportes.includes(
                                    deporte.id!,
                                  )}
                                  onCheckedChange={() =>
                                    handleToggleDeporte(deporte.id!)
                                  }
                                />
                                <label
                                  htmlFor={`deporte-${deporte.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium">
                                    {deporte.nombre}
                                  </div>
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500 italic">
                              Esta persona no registra inscripciones en ningún
                              deporte.
                            </div>
                          )
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-400">
                            Primero selecciona una persona para ver sus
                            deportes.
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

              <Dialog
                open={isAssociateDialogOpen}
                onOpenChange={setIsAssociateDialogOpen}
              >
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
                      Selecciona una persona y los deportes a los que deseas
                      inscribirla
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
                                const search = searchPersona
                                  .toLowerCase()
                                  .trim();
                                if (searchPersona.includes(" - DNI: "))
                                  return true;

                                const nombreCompleto =
                                  `${persona.nombre} ${persona.apellido}`.toLowerCase();
                                return (
                                  nombreCompleto.includes(search) ||
                                  persona.dni?.toLowerCase().includes(search)
                                );
                              })
                              .map((persona) => (
                                <div
                                  key={persona.id}
                                  onClick={() => {
                                    setSelectedPersonaId(persona.id);
                                    setSearchPersona(
                                      `${persona.nombre} ${persona.apellido} - DNI: ${persona.dni}`,
                                    );
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                    selectedPersonaId === persona.id
                                      ? "bg-gray-50"
                                      : ""
                                  }`}
                                >
                                  {selectedPersonaId === persona.id && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                  <span>
                                    {persona.nombre} {persona.apellido} - DNI:{" "}
                                    {persona.dni}
                                  </span>
                                </div>
                              ))}
                            {personas.filter((persona) => {
                              const search = searchPersona.toLowerCase().trim();
                              const nombreCompleto =
                                `${persona.nombre} ${persona.apellido}`.toLowerCase();
                              return (
                                nombreCompleto.includes(search) ||
                                persona.dni?.toLowerCase().includes(search)
                              );
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
                        style={{
                          maxHeight: deportes.length > 4 ? 220 : undefined,
                        }}
                      >
                        {deportes.map((deporte) => (
                          <div
                            key={deporte.id}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-50"
                          >
                            <Checkbox
                              id={`deporte-${deporte.id}`}
                              checked={selectedDeportes.includes(deporte.id!)}
                              onCheckedChange={() =>
                                handleToggleDeporte(deporte.id!)
                              }
                            />
                            <label
                              htmlFor={`deporte-${deporte.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium">
                                {deporte.nombre}
                              </div>
                              <div className="text-sm text-gray-500">
                                $
                                {obtenerCuotaMensualVigente(
                                  deporte,
                                ).toLocaleString()}
                                /mes
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
                    <Button onClick={handleAssociate}>Asociar Deportes</Button>
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
                    <DialogTitle>
                      {editingDeporte ? "Editar Deporte" : "Nuevo Deporte"}
                    </DialogTitle>
                    <DialogDescription>
                      Complete los datos del deporte o actividad
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre del Deporte *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => {
                          setFormData({ ...formData, nombre: e.target.value });
                          if (e.target.value.trim().length > 0)
                            setFormErrors((prev) => ({
                              ...prev,
                              nombre: false,
                            }));
                        }}
                        className={
                          formErrors.nombre
                            ? "border-red-500 focus-visible:ring-red-500 bg-red-50"
                            : ""
                        }
                        required
                      />
                      {formErrors.nombre && (
                        <p className="text-xs text-red-600">
                          Completa el nombre del deporte
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Input
                        id="descripcion"
                        value={formData.descripcion || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            descripcion: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cuotaEntrenador">
                          Cuota Entrenador ($) *
                        </Label>
                        <Input
                          id="cuotaEntrenador"
                          type="number"
                          value={
                            formData.cuotaEntrenador === 0
                              ? ""
                              : formData.cuotaEntrenador
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? 0
                                : parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData,
                              cuotaEntrenador: value,
                            });
                            setFormErrors((prev) => ({
                              ...prev,
                              cuotaEntrenador: false,
                            }));
                          }}
                          required
                          min="0"
                          step="0.01"
                          className={
                            formErrors.cuotaEntrenador
                              ? "border-red-500 focus-visible:ring-red-500 bg-red-50"
                              : ""
                          }
                        />
                        {formErrors.cuotaEntrenador && (
                          <p className="text-xs text-red-600">
                            Ingresa la cuota de entrenador
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cuotaSeguro">Cuota Seguro ($) *</Label>
                        <Input
                          id="cuotaSeguro"
                          type="number"
                          value={
                            formData.cuotaSeguro === 0
                              ? ""
                              : formData.cuotaSeguro
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? 0
                                : parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, cuotaSeguro: value });
                            setFormErrors((prev) => ({
                              ...prev,
                              cuotaSeguro: false,
                            }));
                          }}
                          required
                          min="0"
                          step="0.01"
                          className={
                            formErrors.cuotaSeguro
                              ? "border-red-500 focus-visible:ring-red-500 bg-red-50"
                              : ""
                          }
                        />
                        {formErrors.cuotaSeguro && (
                          <p className="text-xs text-red-600">
                            Ingresa la cuota de seguro
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Total Cuota Mensual (suma)</Label>
                        <div className="p-3 rounded-md border bg-gray-50 font-semibold">
                          $
                          {totalCuota.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      {editingDeporte ? "Guardar Cambios" : "Registrar Deporte"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!Array.isArray(deportes) || deportes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No hay deportes registrados
            </p>
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
                        <FragmentKey key={deporte.id}>
                          <TableRow
                            onClick={() =>
                              deporte.id && toggleExpandDeporte(deporte.id)
                            }
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {expandedDeporteId === deporte.id ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                                <span>{deporte.nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {deporte.descripcion || "—"}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                {obtenerCuotaMensualVigente(
                                  deporte,
                                ).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <UsersIcon className="w-4 h-4 text-blue-600" />
                                {deporte.numeroSocios ?? 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div
                                className="flex justify-end gap-2"
                                onClick={(e) => e.stopPropagation()} // Evita abrir/cerrar desplegable al hacer clic en acciones
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(deporte)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {userRole === "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      deporte.id && handleDelete(deporte.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Fila del Desplegable (Solo se muestra 1 a la vez) */}
                          {expandedDeporteId === deporte.id && (
                            <TableRow key={`expanded-${deporte.id}`}>
                              <TableCell colSpan={5} className="p-0">
                                <DeporteEstadoPagosPanel deporte={deporte} />
                              </TableCell>
                            </TableRow>
                          )}
                        </FragmentKey>
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
// Helper auxiliar para iterar elementos con clave react pura
function FragmentKey({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
