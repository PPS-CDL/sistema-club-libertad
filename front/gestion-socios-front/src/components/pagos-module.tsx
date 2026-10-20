import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Plus,
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  Search,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import cuotaService from "../services/cuotaService";
import pagoService, {
  type IngresoPorSocioDTO,
  type FiltroFechaParams,
  type ResumenIngresos,
  type IngresosPorDeporteDTO,
  type ResumenMensualPorDeporteDTO,
} from "../services/pagoService";
import personaService from "../services/personaService";
import deporteService from "../services/deporteService";
import { configuracionService } from "../services/api";
import type { Cuota } from "../types/cuota";
import type { Persona } from "../types/persona";
import type { Deporte } from "../types/deporte";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import cuotaSocialService from "../services/cuotaSocialService";

const normalizarBusquedaDeporte = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

const obtenerClaveCuota = (cuota: Cuota) =>
  cuota.esSocial ? `social:${cuota.idSocialReal}` : `deportiva:${cuota.id}`;

const prorratearCuota = (c: any) => {
  const socialNominal = Number(c.cuotaSocial) || 0;
  const entrenadorNominal = Number(c.cuotaEntrenador) || 0;
  const seguroNominal = Number(c.cuotaSeguro) || 0;
  const montoReal = Number(c.monto) || 0;
  const totalNominal = socialNominal + entrenadorNominal + seguroNominal;

  if (totalNominal <= 0 || montoReal <= 0) {
    return { social: 0, entrenador: 0, seguro: 0 };
  }
  if (totalNominal === montoReal) {
    return {
      social: socialNominal,
      entrenador: entrenadorNominal,
      seguro: seguroNominal,
    };
  }

  const factor = montoReal / totalNominal;
  const social = Math.round(socialNominal * factor * 100) / 100;
  const entrenador = Math.round(entrenadorNominal * factor * 100) / 100;
  const seguro = Math.round((montoReal - social - entrenador) * 100) / 100;

  return { social, entrenador, seguro };
};

interface Pago {
  id: string;
  socio: string;
  socioDNI: string;
  monto: number;
  fecha: string;
  mes: string;
  metodoPago: string;
  estado: "pagado" | "pendiente" | "vencido";
  conceptos: {
    concepto: string;
    monto: number;
  }[];
}

interface ConfiguracionClubData {
  importeCuotaIndividual: number;
  importeCuotaFamiliar: number;
  fechaEfectiva: string | null;
}

interface PagosModuleProps {
  userRole: "admin" | "secretario";
}

export function PagosModule({ userRole }: PagosModuleProps) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [ingresosPorSocio, setIngresosPorSocio] = useState<
    IngresoPorSocioDTO[]
  >([]);
  const [searchIngresosPorSocio, setSearchIngresosPorSocio] =
    useState<string>("");
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [pagosServidor, setPagosServidor] = useState<any[]>([]);
  const [searchCuota, setSearchCuota] = useState<string>("");
  const [filterDeportePago, setFilterDeportePago] = useState<string>("all");
  const [filterMesPago, setFilterMesPago] = useState<string>("all");
  const [filterSocioPago, setFilterSocioPago] = useState<string>("all");
  const [expandedPagos, setExpandedPagos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("todos");

  // Estado para la Configuración Global del Club
  const [configGlobal, setConfigGlobal] = useState<ConfiguracionClubData>({
    importeCuotaIndividual: 0,
    importeCuotaFamiliar: 0,
    fechaEfectiva: null,
  });

  const getFechaHoy = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [modoFiltroFecha, setModoFiltroFecha] = useState<"dia" | "rango">(
    "dia",
  );
  const [fechaFiltro, setFechaFiltro] = useState<string>(getFechaHoy());
  const [fechaDesdeFiltro, setFechaDesdeFiltro] = useState<string>("");
  const [fechaHastaFiltro, setFechaHastaFiltro] = useState<string>("");

  const opcionesDeportes = useMemo(
    () => [
      { value: "all", label: "Todos los deportes" },
      ...[...deportes]
        .sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
        )
        .map((deporte) => ({
          value: String(deporte.id),
          label: deporte.nombre,
        })),
    ],
    [deportes],
  );

  const [filterDeporteIngreso, setFilterDeporteIngreso] =
    useState<string>("all");
  const [deporteIngresoAbierto, setDeporteIngresoAbierto] = useState(false);
  const [busquedaDeporteIngreso, setBusquedaDeporteIngreso] = useState("");

  const busquedaDeporteIngresoNormalizada = normalizarBusquedaDeporte(
    busquedaDeporteIngreso,
  );
  const opcionesDeporteIngresoFiltradas = opcionesDeportes.filter((opcion) =>
    normalizarBusquedaDeporte(opcion.label).includes(
      busquedaDeporteIngresoNormalizada,
    ),
  );
  const nombreDeporteIngreso =
    opcionesDeportes.find((opcion) => opcion.value === filterDeporteIngreso)
      ?.label || "Todos los deportes";

  const cambiarAperturaDeporteIngreso = (abierto: boolean) => {
    setDeporteIngresoAbierto(abierto);
    if (!abierto) setBusquedaDeporteIngreso("");
  };

  const [ingresosPorDeporte, setIngresosPorDeporte] = useState<
    IngresosPorDeporteDTO[]
  >([]);
  const [resumenIngresos, setResumenIngresos] =
    useState<ResumenIngresos | null>(null);
  const [pagosFiltrados, setPagosFiltrados] = useState<any[]>([]);
  const [cargandoReporte, setCargandoReporte] = useState<boolean>(false);

  const fechaActual = new Date();
  const [mesResumen, setMesResumen] = useState<string>(
    String(fechaActual.getMonth() + 1),
  );
  const [anioResumen, setAnioResumen] = useState<string>(
    String(fechaActual.getFullYear()),
  );
  const [filterDeporteResumen, setFilterDeporteResumen] =
    useState<string>("all");
  const [deporteResumenAbierto, setDeporteResumenAbierto] = useState(false);
  const [busquedaDeporteResumen, setBusquedaDeporteResumen] = useState("");
  const [resumenMensual, setResumenMensual] = useState<
    ResumenMensualPorDeporteDTO[]
  >([]);
  const [cargandoResumenMensual, setCargandoResumenMensual] =
    useState<boolean>(false);

  const busquedaDeporteResumenNormalizada = normalizarBusquedaDeporte(
    busquedaDeporteResumen,
  );
  const opcionesDeporteResumenFiltradas = opcionesDeportes.filter((opcion) =>
    normalizarBusquedaDeporte(opcion.label).includes(
      busquedaDeporteResumenNormalizada,
    ),
  );
  const nombreDeporteResumen =
    opcionesDeportes.find((opcion) => opcion.value === filterDeporteResumen)
      ?.label || "Todos los deportes";

  const cambiarAperturaDeporteResumen = (abierto: boolean) => {
    setDeporteResumenAbierto(abierto);
    if (!abierto) setBusquedaDeporteResumen("");
  };

  const mesesNombres = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const getMesAno = (periodo: string) => {
    const [year, month] = periodo.split("-");
    if (!year || !month) return periodo;
    const mesNum = parseInt(month, 10);
    return `${mesesNombres[mesNum - 1] || "mes"} de ${year}`;
  };

  const cargarCuotas = useCallback(async () => {
    try {
      setLoading(true);

      await cuotaService.actualizarCuotasVencidas().catch((error) => {
        console.warn("No se pudieron actualizar los vencimientos:", error);
      });
      await cuotaService.generarCuotasMesActual().catch((error) => {
        console.warn("No se pudieron generar las cuotas del mes:", error);
      });

      const [
        cuotasRes,
        cuotasSocialesRes,
        personasRes,
        deportesRes,
        pagosRes,
        ingresosPorSocioRes,
        configRes,
      ] = await Promise.all([
        cuotaService.getAll(),
        cuotaSocialService.getAll().catch((error) => {
          console.error("No se pudieron cargar las cuotas sociales:", error);
          toast.error("No se pudieron cargar las cuotas sociales");
          return { data: [] };
        }),
        personaService.getAll(),
        deporteService.getAll(),
        pagoService.getAll(),
        pagoService.getIngresosPorSocio(),
        configuracionService.get().catch(() => ({ data: null })),
      ]);
      const cuotasDeportivasData = Array.isArray(cuotasRes.data)
        ? cuotasRes.data
        : [];
      const cuotasSocialesData = Array.isArray(cuotasSocialesRes.data)
        ? cuotasSocialesRes.data
        : [];

      const personasData = Array.isArray(personasRes.data)
        ? personasRes.data
        : [];
      const deportesData = Array.isArray(deportesRes.data)
        ? deportesRes.data
        : [];
      const pagosData = Array.isArray(pagosRes.data) ? pagosRes.data : [];
      // Mapear cuotas sociales para que cumplan estrictamente con la interfaz Cuota
      const cuotasSocialesTransformadas: Cuota[] = cuotasSocialesData.map(
        (cs) => {
          const personaIdVal =
            typeof cs.socio === "object" && cs.socio !== null
              ? cs.socio.id
              : cs.socio;

          return {
            id: `social-${cs.id}`,
            idSocialReal: cs.id,
            esSocial: true,
            personaId: Number(personaIdVal) || 0,
            deporteId: null,
            monto: Number(cs.monto) || 0,
            periodo: cs.periodo,
            concepto: cs.concepto || `Cuota Social ${cs.tipoCuota}`,
            estado:
              cs.estado === "PAGADA"
                ? "PAGADA"
                : cs.estado === "VENCIDA"
                  ? "VENCIDA"
                  : cs.estado === "CANCELADA"
                    ? "CANCELADA"
                    : "PENDIENTE",
            fechaGeneracion: cs.fechaGeneracion,
            fechaVencimiento: cs.fechaVencimiento,
            pagoId: cs.pagoId,
            cuotaEntrenador: 0,
            cuotaSeguro: 0,
            cuotaSocial: Number(cs.monto) || 0,
          };
        },
      );

      // Unificar ambas listas con el tipo Cuota[]
      const todasLasCuotasUnificadas: Cuota[] = [
        ...cuotasDeportivasData,
        ...cuotasSocialesTransformadas,
      ];

      setCuotas(todasLasCuotasUnificadas);
      setPersonas(personasData);
      setDeportes(deportesData);
      setPagosServidor(pagosData);
      setIngresosPorSocio(
        Array.isArray(ingresosPorSocioRes.data) ? ingresosPorSocioRes.data : [],
      );

      if (configRes?.data) {
        setConfigGlobal({
          importeCuotaIndividual:
            Number(
              configRes.data.importeCuotaIndividual ??
                configRes.data.montoCuotaIndividual ??
                configRes.data.cuotaIndividual,
            ) || 0,
          importeCuotaFamiliar:
            Number(
              configRes.data.importeCuotaFamiliar ??
                configRes.data.montoCuotaFamiliar ??
                configRes.data.cuotaFamiliar,
            ) || 0,
          fechaEfectiva:
            configRes.data.fechaEfectiva ??
            configRes.data.fechaActualizacion ??
            null,
        });
      }

      const personaMap = new Map<number, Persona>(
        personasData.map((p) => [Number(p.id), p] as const),
      );
      const deporteMap = new Map<number, Deporte>(
        deportesData.map((d) => [Number(d.id), d] as const),
      );
      const pagoMap = new Map<number, any>(
        pagosData.map((p: any) => [Number(p.id), p]),
      );

      const pagosTransformados = todasLasCuotasUnificadas
        .filter((cuota) => cuota.estado !== "CANCELADA")
        .map((cuota, idx) => {
          const personaIdNum = Number(
            typeof cuota.personaId === "object" && cuota.personaId !== null
              ? (cuota.personaId as any).id
              : cuota.personaId,
          );
          const deporteIdNum = cuota.deporteId
            ? Number(
                typeof cuota.deporteId === "object" && cuota.deporteId !== null
                  ? (cuota.deporteId as any).id
                  : cuota.deporteId,
              )
            : null;
          const pagoIdNum = cuota.pagoId
            ? Number(
                typeof cuota.pagoId === "object" && cuota.pagoId !== null
                  ? (cuota.pagoId as any).id
                  : cuota.pagoId,
              )
            : null;

          const p = personaMap.get(personaIdNum);
          const d = deporteIdNum ? deporteMap.get(deporteIdNum) : null;
          const pagoAsociado = pagoIdNum ? pagoMap.get(pagoIdNum) : undefined;

          const metodoReal =
            cuota.estado === "PAGADA"
              ? pagoAsociado?.metodoPago || "TRANSFERENCIA"
              : "—";
          const fechaPagoReal =
            cuota.estado === "PAGADA"
              ? pagoAsociado?.fechaPago || cuota.fechaGeneracion || ""
              : "";

          return {
            id: (cuota.id || idx).toString(),
            socio: p
              ? `${p.nombre} ${p.apellido}`
              : `Persona ${cuota.personaId}`,
            socioDNI: p?.dni || "",
            monto: cuota.monto,
            fecha: fechaPagoReal,
            mes: getMesAno(cuota.periodo),
            metodoPago: metodoReal,
            estado:
              cuota.estado === "PAGADA"
                ? "pagado"
                : cuota.estado === "VENCIDA"
                  ? "vencido"
                  : cuota.estado === "CANCELADA"
                    ? "cancelado"
                    : "pendiente",
            conceptos: [
              {
                concepto: cuota.concepto || d?.nombre || "Cuota Social",
                monto: cuota.monto,
              },
            ],
          } as Pago;
        });

      setPagos(pagosTransformados);
    } catch (error) {
      console.error("Error al cargar cuotas:", error);
      toast.error("Error al cargar las cuotas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCuotas();
  }, [cargarCuotas]);

  // Estados y funciones para el registro de pagos
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState("");
  const [selectedCuotas, setSelectedCuotas] = useState<string[]>([]);
  const [metodoPago, setMetodoPago] = useState<
    "EFECTIVO" | "TRANSFERENCIA" | "DEBITO_AUTOMATICO"
  >("EFECTIVO");
  const [observaciones, setObservaciones] = useState("");

  // Obtiene datos del socio seleccionado actualmente
  const socioSeleccionadoObj = useMemo(() => {
    if (!selectedSocio) return null;
    return personas.find((p) => String(p.id) === String(selectedSocio)) || null;
  }, [selectedSocio, personas]);

  const handleRegistrarPago = async () => {
    if (!selectedSocio || selectedCuotas.length === 0) {
      toast.error("Selecciona un socio y al menos una cuota");
      return;
    }

    const cuotasSeleccionadas = cuotas.filter((cuota) =>
      selectedCuotas.includes(obtenerClaveCuota(cuota)),
    );
    const cuotaIdsDeportivas: number[] = [];
    const cuotaSocialIds: number[] = [];

    cuotasSeleccionadas.forEach((c) => {
      if (c.esSocial && c.idSocialReal) {
        cuotaSocialIds.push(c.idSocialReal);
      } else if (typeof c.id === "number") {
        cuotaIdsDeportivas.push(c.id);
      } else if (typeof c.id === "string") {
        const parsed = parseInt(c.id, 10);
        if (!isNaN(parsed)) cuotaIdsDeportivas.push(parsed);
      }
    });
    const montoOriginal = cuotasSeleccionadas.reduce(
      (sum, c) => sum + (c.monto || 0),
      0,
    );

    if (montoOriginal <= 0) {
      toast.error("El monto total debe ser mayor a 0");
      return;
    }

    const fechaPago = new Date();
    const yyyy = fechaPago.getFullYear();
    const mm = String(fechaPago.getMonth() + 1).padStart(2, "0");
    const dd = String(fechaPago.getDate()).padStart(2, "0");
    const fechaPagoStr = `${yyyy}-${mm}-${dd}`;

    try {
      await pagoService.create({
        socioId: Number(selectedSocio),
        fechaPago: fechaPagoStr,
        montoOriginal,
        montoDescuento: 0,
        montoTotal: montoOriginal,
        metodoPago,
        observaciones: observaciones.trim() || undefined,
        cuotaIds: cuotaIdsDeportivas,
        cuotaSocialIds,
      });

      toast.success("Pago registrado correctamente");
      setIsDialogOpen(false);
      await cargarCuotas();
      resetForm();
    } catch (error) {
      toast.error("Error al registrar el pago");
      console.error("Error al registrar pago:", error);
    }
  };

  const resetForm = () => {
    setSelectedSocio("");
    setSelectedCuotas([]);
    setMetodoPago("EFECTIVO");
    setObservaciones("");
  };

  const generarArchivoRedLink = () => {
    const pagosPendientes = pagos.filter(
      (p) => p.estado === "pendiente" && p.metodoPago === "DEBITO_AUTOMATICO",
    );

    if (pagosPendientes.length === 0) {
      toast.error("No hay pagos pendientes para débito automático");
      return;
    }

    const contenido = pagosPendientes
      .map((p) => `${p.socioDNI}|${p.socio}|${p.monto}|${p.mes}`)
      .join("\n");
    const blob = new Blob([contenido], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `redlink_debitos_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();

    toast.success("Archivo de Red Link generado correctamente");
  };

  const formatearFechaDisplay = (fechaStr?: string) => {
    if (!fechaStr) return "—";
    const f = fechaStr.split("T")[0];
    const parts = f.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return f;
  };

  const exportarCSVIngresosPorDeporte = () => {
    if (ingresosPorDeporte.length === 0 && pagosFiltrados.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const colWidths = [32, 22, 22, 22, 22, 25];
    const formatearFila = (cols: (string | number)[]) =>
      cols
        .map((col, idx) => {
          const str = String(col ?? "").trim();
          const width = colWidths[idx] || 22;
          return str.padEnd(width, " ");
        })
        .join(";");

    let lineas: string[] = [];
    lineas.push("REPORTE DE INGRESOS POR DISCIPLINA");
    lineas.push(
      `Filtro: ${modoFiltroFecha === "dia" ? `Dia ${fechaFiltro}` : `Desde ${fechaDesdeFiltro || "inicio"} hasta ${fechaHastaFiltro || "fin"}`}`,
    );
    lineas.push(`Deporte: ${nombreDeporteIngreso}`);
    lineas.push("");
    lineas.push(
      formatearFila([
        "Deporte",
        "Cuotas Cobradas",
        "Cuota Social",
        "Cuota Entrenador",
        "Cuota Seguro",
        "Total Recaudado",
      ]),
    );

    ingresosPorDeporte.forEach((item) => {
      lineas.push(
        formatearFila([
          item.nombreDeporte,
          item.cantidadCuotasCobradas,
          `$${Number(item.totalSocial || 0).toLocaleString()}`,
          `$${Number(item.totalEntrenador || 0).toLocaleString()}`,
          `$${Number(item.totalSeguro || 0).toLocaleString()}`,
          `$${Number(item.montoTotal || 0).toLocaleString()}`,
        ]),
      );
    });

    lineas.push("");
    lineas.push(
      formatearFila([
        "TOTAL GENERAL",
        ingresosPorDeporte.reduce(
          (acc, item) => acc + (Number(item.cantidadCuotasCobradas) || 0),
          0,
        ),
        `$${ingresosPorDeporte.reduce((acc, item) => acc + (Number(item.totalSocial) || 0), 0).toLocaleString()}`,
        `$${ingresosPorDeporte.reduce((acc, item) => acc + (Number(item.totalEntrenador) || 0), 0).toLocaleString()}`,
        `$${ingresosPorDeporte.reduce((acc, item) => acc + (Number(item.totalSeguro) || 0), 0).toLocaleString()}`,
        `$${ingresosPorDeporte.reduce((acc, item) => acc + (Number(item.montoTotal) || 0), 0).toLocaleString()}`,
      ]),
    );

    const contenidoCSV = "\uFEFF" + lineas.join("\n");
    const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const dd = String(ahora.getDate()).padStart(2, "0");
    const hh = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");
    const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;

    const fechaArchivo =
      modoFiltroFecha === "dia"
        ? fechaFiltro
        : `${fechaDesdeFiltro || "inicio"}_${fechaHastaFiltro || "fin"}`;
    a.download = `ingresos_deporte_${fechaArchivo}_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo CSV descargado correctamente");
  };

  const exportarCSVResumenMensual = () => {
    if (resumenMensual.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const colWidths = [28, 16, 16, 18, 18, 18, 20, 20];
    const formatearFila = (cols: (string | number)[]) =>
      cols
        .map((col, idx) => {
          const str = String(col ?? "").trim();
          const width = colWidths[idx] || 18;
          return str.padEnd(width, " ");
        })
        .join(";");

    const mesNum = parseInt(mesResumen, 10);
    const mesNombre = mesesNombres[mesNum - 1] || mesResumen;

    let lineas: string[] = [];
    lineas.push("REPORTE DE RESUMEN MENSUAL POR DISCIPLINA");
    lineas.push(`Período: ${mesNombre} de ${anioResumen}`);
    lineas.push(`Deporte: ${nombreDeporteResumen}`);
    lineas.push("");
    lineas.push(
      formatearFila([
        "Deporte",
        "Socios Al Día",
        "Socios Deudores",
        "Cobrado Social",
        "Cobrado Entrenador",
        "Cobrado Seguro",
        "Total Cobrado",
        "Total Adeudado",
      ]),
    );

    resumenMensual.forEach((item) => {
      lineas.push(
        formatearFila([
          item.nombreDeporte,
          item.sociosAlDia,
          item.sociosDeudores,
          `$${Number(item.cobradoSocial || 0).toLocaleString()}`,
          `$${Number(item.cobradoEntrenador || 0).toLocaleString()}`,
          `$${Number(item.cobradoSeguro || 0).toLocaleString()}`,
          `$${Number(item.totalCobrado || 0).toLocaleString()}`,
          `$${Number(item.totalAdeudado || 0).toLocaleString()}`,
        ]),
      );
    });

    lineas.push("");
    lineas.push(
      formatearFila([
        "TOTAL",
        resumenMensual.reduce(
          (acc, item) => acc + (Number(item.sociosAlDia) || 0),
          0,
        ),
        resumenMensual.reduce(
          (acc, item) => acc + (Number(item.sociosDeudores) || 0),
          0,
        ),
        `$${resumenMensual.reduce((acc, item) => acc + (Number(item.cobradoSocial) || 0), 0).toLocaleString()}`,
        `$${resumenMensual.reduce((acc, item) => acc + (Number(item.cobradoEntrenador) || 0), 0).toLocaleString()}`,
        `$${resumenMensual.reduce((acc, item) => acc + (Number(item.cobradoSeguro) || 0), 0).toLocaleString()}`,
        `$${resumenMensual.reduce((acc, item) => acc + (Number(item.totalCobrado) || 0), 0).toLocaleString()}`,
        `$${resumenMensual.reduce((acc, item) => acc + (Number(item.totalAdeudado) || 0), 0).toLocaleString()}`,
      ]),
    );

    const contenidoCSV = "\uFEFF" + lineas.join("\n");
    const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const dd = String(ahora.getDate()).padStart(2, "0");
    const hh = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");
    const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;

    a.download = `resumen_mensual_${anioResumen}_${mesResumen}_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo CSV descargado correctamente");
  };

  const ejecutarResumenMensualLocal = useCallback(() => {
    const anio = parseInt(anioResumen, 10);
    const mes = parseInt(mesResumen, 10);
    const cuotasDelMes = cuotas.filter((c) => {
      if (!c.periodo) return false;
      const parts = c.periodo.split("-");
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === anio && parseInt(parts[1], 10) === mes;
    });

    const deportesAProcesar =
      filterDeporteResumen !== "all"
        ? deportes.filter((d) => String(d.id) === filterDeporteResumen)
        : deportes;

    const resultado: ResumenMensualPorDeporteDTO[] = deportesAProcesar.map(
      (dep) => {
        const cuotasDep = cuotasDelMes.filter(
          (c) => Number(c.deporteId) === Number(dep.id),
        );
        const pagadas = cuotasDep.filter((c) => c.estado === "PAGADA");
        const noPagadas = cuotasDep.filter((c) => c.estado !== "PAGADA");

        let totalCobrado = 0;
        let cobradoSocial = 0;
        let cobradoEntrenador = 0;
        let cobradoSeguro = 0;
        pagadas.forEach((c) => {
          totalCobrado += Number(c.monto) || 0;
          const d = prorratearCuota(c);
          cobradoSocial += d.social;
          cobradoEntrenador += d.entrenador;
          cobradoSeguro += d.seguro;
        });

        let totalAdeudado = 0;
        let adeudadoSocial = 0;
        let adeudadoEntrenador = 0;
        let adeudadoSeguro = 0;
        noPagadas.forEach((c) => {
          totalAdeudado += Number(c.monto) || 0;
          const d = prorratearCuota(c);
          adeudadoSocial += d.social;
          adeudadoEntrenador += d.entrenador;
          adeudadoSeguro += d.seguro;
        });

        return {
          deporteId: Number(dep.id),
          nombreDeporte: dep.nombre,
          sociosAlDia: new Set(pagadas.map((c) => Number(c.personaId))).size,
          sociosDeudores: new Set(noPagadas.map((c) => Number(c.personaId)))
            .size,
          totalCobrado,
          totalAdeudado,
          cobradoSocial,
          cobradoEntrenador,
          cobradoSeguro,
          adeudadoSocial,
          adeudadoEntrenador,
          adeudadoSeguro,
        };
      },
    );

    if (filterDeporteResumen === "all") {
      const cuotasSocialesDelMes = cuotasDelMes.filter(
        (cuota) => cuota.esSocial && cuota.estado !== "CANCELADA",
      );
      const pagadasSociales = cuotasSocialesDelMes.filter(
        (cuota) => cuota.estado === "PAGADA",
      );
      const adeudadasSociales = cuotasSocialesDelMes.filter(
        (cuota) => cuota.estado === "PENDIENTE" || cuota.estado === "VENCIDA",
      );
      const totalSocialCobrado = pagadasSociales.reduce(
        (total, cuota) => total + (Number(cuota.monto) || 0),
        0,
      );
      const totalSocialAdeudado = adeudadasSociales.reduce(
        (total, cuota) => total + (Number(cuota.monto) || 0),
        0,
      );

      if (cuotasSocialesDelMes.length > 0) {
        resultado.push({
          deporteId: 0,
          nombreDeporte: "Cuota Social",
          sociosAlDia: new Set(pagadasSociales.map((cuota) => cuota.personaId))
            .size,
          sociosDeudores: new Set(
            adeudadasSociales.map((cuota) => cuota.personaId),
          ).size,
          totalCobrado: totalSocialCobrado,
          totalAdeudado: totalSocialAdeudado,
          cobradoSocial: totalSocialCobrado,
          cobradoEntrenador: 0,
          cobradoSeguro: 0,
          adeudadoSocial: totalSocialAdeudado,
          adeudadoEntrenador: 0,
          adeudadoSeguro: 0,
        });
      }
    }

    setResumenMensual(resultado);
  }, [anioResumen, mesResumen, filterDeporteResumen, cuotas, deportes]);

  const consultarResumenMensual = useCallback(async () => {
    setCargandoResumenMensual(true);
    const anio = parseInt(anioResumen, 10);
    const mes = parseInt(mesResumen, 10);
    if (isNaN(anio) || isNaN(mes)) {
      toast.error("Año o mes inválido");
      setCargandoResumenMensual(false);
      return;
    }

    try {
      const res = await pagoService.getResumenMensual({
        anio,
        mes,
        deporteId:
          filterDeporteResumen !== "all" ? filterDeporteResumen : undefined,
      });

      if (res?.data && Array.isArray(res.data)) {
        setResumenMensual(res.data);
        toast.success("Resumen mensual cargado correctamente");
      } else {
        ejecutarResumenMensualLocal();
      }
    } catch (error) {
      ejecutarResumenMensualLocal();
    } finally {
      setCargandoResumenMensual(false);
    }
  }, [
    anioResumen,
    mesResumen,
    filterDeporteResumen,
    ejecutarResumenMensualLocal,
  ]);

  const ejecutarFiltroLocal = useCallback(() => {
    const coincide = (fechaStr?: string) => {
      if (!fechaStr) return false;
      const f = fechaStr.split("T")[0].trim();
      if (modoFiltroFecha === "dia") {
        return f === fechaFiltro;
      }
      if (fechaDesdeFiltro && fechaHastaFiltro) {
        return f >= fechaDesdeFiltro && f <= fechaHastaFiltro;
      }
      if (fechaDesdeFiltro) return f >= fechaDesdeFiltro;
      if (fechaHastaFiltro) return f <= fechaHastaFiltro;
      return true;
    };

    const pagosDelDia = (
      Array.isArray(pagosServidor) ? pagosServidor : []
    ).filter((p) => coincide(p.fechaPago));

    if (filterDeporteIngreso !== "all") {
      const pagosDelDeporte = pagosDelDia.filter((p) => {
        const cuotasDePago = cuotas.filter(
          (c) => Number(c.pagoId) === Number(p.id),
        );
        return cuotasDePago.some(
          (c) => String(c.deporteId) === filterDeporteIngreso,
        );
      });

      const cuotasDelDeporte = cuotas.filter(
        (c) =>
          String(c.deporteId) === filterDeporteIngreso &&
          pagosDelDeporte.some((p) => Number(p.id) === Number(c.pagoId)),
      );

      if (pagosDelDeporte.length === 0) {
        setResumenIngresos(null);
        setPagosFiltrados([]);
        setIngresosPorDeporte([]);
        toast.info(
          "No se encontraron ingresos para la disciplina seleccionada",
        );
        return;
      }

      let total = 0;
      let totalEntrenador = 0;
      let totalSeguro = 0;
      let totalSocial = 0;
      cuotasDelDeporte.forEach((c) => {
        total += Number(c.monto) || 0;
        const d = prorratearCuota(c);
        totalSocial += d.social;
        totalEntrenador += d.entrenador;
        totalSeguro += d.seguro;
      });

      const dep = deportes.find((d) => String(d.id) === filterDeporteIngreso);

      setResumenIngresos({
        cantidadIngresos: cuotasDelDeporte.length,
        montoTotal: total,
        totalEntrenador,
        totalSeguro,
        totalSocial,
      });
      setPagosFiltrados(pagosDelDeporte);
      setIngresosPorDeporte([
        {
          deporteId: Number(filterDeporteIngreso),
          nombreDeporte: dep?.nombre || "Deporte",
          cantidadCuotasCobradas: cuotasDelDeporte.length,
          totalSocial,
          totalEntrenador,
          totalSeguro,
          montoTotal: total,
        },
      ]);
      toast.success(
        `Se encontraron ${cuotasDelDeporte.length} cuotas cobradas`,
      );
      return;
    }

    if (pagosDelDia.length > 0) {
      const totalRecaudado = pagosDelDia.reduce(
        (sum, p) => sum + (Number(p.montoTotal) || 0),
        0,
      );
      const totalEntrenador = pagosDelDia.reduce(
        (sum, p) => sum + (Number(p.cuotaEntrenador) || 0),
        0,
      );
      const totalSeguro = pagosDelDia.reduce(
        (sum, p) => sum + (Number(p.cuotaSeguro) || 0),
        0,
      );
      const totalSocial = pagosDelDia.reduce(
        (sum, p) => sum + (Number(p.cuotaSocial) || 0),
        0,
      );

      const deportesMap = new Map<number, IngresosPorDeporteDTO>();
      cuotas.forEach((c) => {
        if (
          c.estado === "PAGADA" &&
          pagosDelDia.some((p) => Number(p.id) === Number(c.pagoId))
        ) {
          const depId = Number(c.deporteId);
          const dep = deportes.find((d) => Number(d.id) === depId);
          const nombre = dep?.nombre || "General / Social";
          if (!deportesMap.has(depId)) {
            deportesMap.set(depId, {
              deporteId: depId,
              nombreDeporte: nombre,
              cantidadCuotasCobradas: 0,
              totalSocial: 0,
              totalEntrenador: 0,
              totalSeguro: 0,
              montoTotal: 0,
            });
          }
          const item = deportesMap.get(depId)!;
          item.cantidadCuotasCobradas += 1;
          const d = prorratearCuota(c);
          item.totalSocial += d.social;
          item.totalEntrenador += d.entrenador;
          item.totalSeguro += d.seguro;
          item.montoTotal += Number(c.monto) || 0;
        }
      });

      setResumenIngresos({
        cantidadIngresos: pagosDelDia.length,
        montoTotal: totalRecaudado,
        totalEntrenador,
        totalSeguro,
        totalSocial,
      });
      setPagosFiltrados(pagosDelDia);
      setIngresosPorDeporte(Array.from(deportesMap.values()));
      toast.success(`Se encontraron ${pagosDelDia.length} ingresos`);
    } else {
      setResumenIngresos(null);
      setPagosFiltrados([]);
      setIngresosPorDeporte([]);
    }
  }, [
    modoFiltroFecha,
    fechaFiltro,
    fechaDesdeFiltro,
    fechaHastaFiltro,
    filterDeporteIngreso,
    pagosServidor,
    cuotas,
    deportes,
  ]);

  const consultarIngresosPorFecha = useCallback(async () => {
    setCargandoReporte(true);
    const params: FiltroFechaParams = {};
    if (modoFiltroFecha === "dia") {
      if (!fechaFiltro) {
        toast.error("Selecciona una fecha");
        setCargandoReporte(false);
        return;
      }
      params.fecha = fechaFiltro;
    } else {
      if (!fechaDesdeFiltro && !fechaHastaFiltro) {
        toast.error("Ingresa al menos una fecha desde o hasta");
        setCargandoReporte(false);
        return;
      }
      if (fechaDesdeFiltro) params.fechaDesde = fechaDesdeFiltro;
      if (fechaHastaFiltro) params.fechaHasta = fechaHastaFiltro;
    }
    if (filterDeporteIngreso !== "all") {
      params.deporteId = filterDeporteIngreso;
    }

    try {
      const [resumenRes, listadoRes, deporteRes] = await Promise.all([
        pagoService.getResumenIngresos(params),
        pagoService.getByFechaORango(params),
        pagoService.getIngresosPorDeporte(params),
      ]);

      const listaPagos = Array.isArray(listadoRes?.data) ? listadoRes.data : [];

      if (filterDeporteIngreso !== "all") {
        const pagosDelDeporte = listaPagos.filter((p: any) => {
          const cuotasDePago = cuotas.filter(
            (c) => Number(c.pagoId) === Number(p.id),
          );
          return cuotasDePago.some(
            (c) => String(c.deporteId) === filterDeporteIngreso,
          );
        });

        const cuotasDelDeporte = cuotas.filter(
          (c) =>
            String(c.deporteId) === filterDeporteIngreso &&
            pagosDelDeporte.some((p: any) => Number(p.id) === Number(c.pagoId)),
        );

        if (pagosDelDeporte.length === 0) {
          setResumenIngresos(null);
          setPagosFiltrados([]);
          setIngresosPorDeporte([]);
          toast.info(
            "No se encontraron ingresos para la disciplina seleccionada",
          );
          return;
        }

        let total = 0;
        let totalEntrenador = 0;
        let totalSeguro = 0;
        let totalSocial = 0;
        cuotasDelDeporte.forEach((c) => {
          total += Number(c.monto) || 0;
          const d = prorratearCuota(c);
          totalSocial += d.social;
          totalEntrenador += d.entrenador;
          totalSeguro += d.seguro;
        });

        const dep = deportes.find((d) => String(d.id) === filterDeporteIngreso);

        setResumenIngresos({
          cantidadIngresos: cuotasDelDeporte.length,
          montoTotal: total,
          totalEntrenador,
          totalSeguro,
          totalSocial,
        });
        setPagosFiltrados(pagosDelDeporte);
        setIngresosPorDeporte([
          {
            deporteId: Number(filterDeporteIngreso),
            nombreDeporte: dep?.nombre || "Deporte",
            cantidadCuotasCobradas: cuotasDelDeporte.length,
            totalSocial,
            totalEntrenador,
            totalSeguro,
            montoTotal: total,
          },
        ]);
        toast.success(
          `Se encontraron ${cuotasDelDeporte.length} cuotas cobradas`,
        );
      } else {
        const listaDeportes = Array.isArray(deporteRes?.data)
          ? deporteRes.data
          : [];
        setIngresosPorDeporte(listaDeportes);
        setResumenIngresos(resumenRes?.data || null);
        setPagosFiltrados(listaPagos);
        toast.success(
          `Se encontraron ${resumenRes?.data?.cantidadIngresos ?? listaPagos.length} ingresos`,
        );
      }
    } catch (error) {
      ejecutarFiltroLocal();
    } finally {
      setCargandoReporte(false);
    }
  }, [
    modoFiltroFecha,
    fechaFiltro,
    fechaDesdeFiltro,
    fechaHastaFiltro,
    filterDeporteIngreso,
    cuotas,
    deportes,
    ejecutarFiltroLocal,
  ]);

  const generarReporte = (tipo: "ingresos" | "deudas") => {
    if (tipo === "ingresos") {
      setActiveTab("ingresos-fecha");
      consultarIngresosPorFecha();
    } else {
      const deudas = pagos.filter(
        (p) => p.estado === "pendiente" || p.estado === "vencido",
      );
      const total = deudas.reduce((sum, p) => sum + p.monto, 0);
      toast.success(`Reporte de deudas: $${total.toLocaleString()}`);
    }
  };

  const hoy = new Date().toISOString().split("T")[0];
  const estadisticas = {
    totalIngresos: pagos
      .filter((p) => p.estado === "pagado")
      .reduce((sum, p) => sum + p.monto, 0),
    ingresosDia: pagos
      .filter(
        (p) => p.estado === "pagado" && p.fecha && p.fecha.startsWith(hoy),
      )
      .reduce((sum, p) => sum + p.monto, 0),
    totalPendientes: pagos
      .filter((p) => p.estado === "pendiente")
      .reduce((sum, p) => sum + p.monto, 0),
    totalVencidos: pagos
      .filter((p) => p.estado === "vencido")
      .reduce((sum, p) => sum + p.monto, 0),
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando cuotas y configuración...
      </div>
    );

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pagado: "default",
      pendiente: "secondary",
      vencido: "destructive",
    };
    return variants[estado as keyof typeof variants] || "default";
  };

  const getMetodoPagoLabel = (metodo?: string) => {
    if (!metodo || metodo === "—") return "—";
    const labels: Record<string, string> = {
      EFECTIVO: "Efectivo",
      TRANSFERENCIA: "Transferencia",
      DEBITO_AUTOMATICO: "Débito Automático",
    };
    return labels[metodo] || metodo;
  };

  const togglePagoExpanded = (pagoId: string) => {
    setExpandedPagos((prev) => {
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
              <Button
                variant="outline"
                onClick={() => generarReporte("ingresos")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Reporte Ingresos
              </Button>
              <Button
                variant="outline"
                onClick={() => generarReporte("deudas")}
              >
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
                      Selecciona el socio y las cuotas que deseas marcar como
                      pagadas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Banner de valores vigentes de configuración */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-blue-900">
                        <Building2 className="w-4 h-4" />
                        Valores Base de Cuota Social Configurados:
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>
                          • Cuota Individual:{" "}
                          <strong>
                            $
                            {configGlobal.importeCuotaIndividual.toLocaleString()}
                          </strong>
                        </span>
                        <span>
                          • Cuota Familiar:{" "}
                          <strong>
                            $
                            {configGlobal.importeCuotaFamiliar.toLocaleString()}
                          </strong>
                        </span>
                      </div>
                      {configGlobal.fechaEfectiva && (
                        <p className="text-[11px] text-blue-600 italic">
                          Transición efectiva desde:{" "}
                          {configGlobal.fechaEfectiva}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Socio *</Label>
                        <Select
                          value={selectedSocio}
                          onValueChange={(v) => {
                            setSelectedSocio(v);
                            setSelectedCuotas([]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un socio" />
                          </SelectTrigger>
                          <SelectContent>
                            {personas.map((socio) => (
                              <SelectItem
                                key={socio.id}
                                value={String(socio.id)}
                              >
                                {socio.nombre} {socio.apellido} (DNI:{" "}
                                {socio.dni})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Método de Pago *</Label>
                        <Select
                          value={metodoPago}
                          onValueChange={(v: any) => setMetodoPago(v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                            <SelectItem value="TRANSFERENCIA">
                              Transferencia
                            </SelectItem>
                            <SelectItem value="DEBITO_AUTOMATICO">
                              Débito Automático
                            </SelectItem>
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
                          .filter(
                            (c) =>
                              selectedSocio &&
                              Number(
                                typeof c.personaId === "object" &&
                                  c.personaId !== null
                                  ? (c.personaId as any).id
                                  : c.personaId,
                              ) === Number(selectedSocio) &&
                              c.estado !== "PAGADA" &&
                              c.estado !== "CANCELADA",
                          )
                          .map((cuota) => {
                            const cuotaKey = obtenerClaveCuota(cuota);
                            const checked = selectedCuotas.includes(cuotaKey);
                            const deporte = cuota.deporteId
                              ? deportes.find(
                                  (d) =>
                                    Number(d.id) === Number(cuota.deporteId),
                                )
                              : null;
                            return (
                              <div
                                key={cuotaKey}
                                className="flex items-center gap-3 p-3"
                              >
                                <Checkbox
                                  id={`cuota-${cuotaKey}`}
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    if (val) {
                                      setSelectedCuotas((prev) =>
                                        prev.includes(cuotaKey)
                                          ? prev
                                          : [...prev, cuotaKey],
                                      );
                                    } else {
                                      setSelectedCuotas((prev) =>
                                        prev.filter((id) => id !== cuotaKey),
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`cuota-${cuotaKey}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium flex items-center gap-2">
                                    {cuota.concepto ||
                                      deporte?.nombre ||
                                      "Cuota Social"}
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {cuota.estado}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Periodo: {getMesAno(cuota.periodo)}
                                  </div>
                                </label>
                                <div className="text-sm font-semibold">
                                  ${(cuota.monto || 0).toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        {selectedSocio &&
                          cuotas.filter(
                            (c) =>
                              Number(c.personaId) === Number(selectedSocio) &&
                              c.estado !== "PAGADA" &&
                              c.estado !== "CANCELADA",
                          ).length === 0 && (
                            <div className="p-3 text-sm text-gray-500">
                              No hay cuotas pendientes para este socio
                            </div>
                          )}
                        {!selectedSocio && (
                          <div className="p-3 text-sm text-gray-500">
                            Selecciona un socio para ver sus cuotas
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Total seleccionado:</span>
                        <span className="font-semibold text-base">
                          $
                          {cuotas
                            .filter((cuota) =>
                              selectedCuotas.includes(obtenerClaveCuota(cuota)),
                            )
                            .reduce((sum, c) => sum + (c.monto || 0), 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
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
              <TabsTrigger value="ingresosPorSocio">
                Ingresos por socio
              </TabsTrigger>
              <TabsTrigger
                value="ingresos-fecha"
                className="flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                Ingresos por Fecha
              </TabsTrigger>
              <TabsTrigger
                value="resumen-mensual"
                className="flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Resumen Mensual
              </TabsTrigger>
            </TabsList>

            {["todos", "pagados", "pendientes", "vencidos"].map((tab) => (
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
                        .filter((p) => {
                          if (tab === "todos") return true;
                          if (tab === "pagados") return p.estado === "pagado";
                          if (tab === "pendientes")
                            return p.estado === "pendiente";
                          if (tab === "vencidos") return p.estado === "vencido";
                          return true;
                        })
                        .filter((p) => {
                          const search = searchCuota.toLowerCase().trim();
                          if (!search) return true;
                          return (
                            p.socio.toLowerCase().includes(search) ||
                            p.socioDNI.toLowerCase().includes(search) ||
                            p.estado.toLowerCase().includes(search) ||
                            p.conceptos.some((c) =>
                              c.concepto.toLowerCase().includes(search),
                            )
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
                                    <span className="text-gray-600">
                                      {c.concepto}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span>${pago.monto.toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              {pago.estado === "pagado" &&
                              pago.metodoPago &&
                              pago.metodoPago !== "—" ? (
                                <Badge variant="outline">
                                  {getMetodoPagoLabel(pago.metodoPago)}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {pago.fecha
                                ? formatearFechaDisplay(pago.fecha)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getEstadoBadge(pago.estado) as any}
                              >
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
                  <Label
                    htmlFor="filterDeportePago"
                    className="whitespace-nowrap"
                  >
                    Filtrar por deporte:
                  </Label>
                  <Select
                    value={filterDeportePago}
                    onValueChange={setFilterDeportePago}
                  >
                    <SelectTrigger id="filterDeportePago" className="w-64">
                      <SelectValue placeholder="Todos los deportes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los deportes</SelectItem>
                      {deportes.map((deporte) => (
                        <SelectItem key={deporte.id} value={String(deporte.id)}>
                          {deporte.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Label htmlFor="filterMesPago" className="whitespace-nowrap">
                    Filtrar por mes:
                  </Label>
                  <Select
                    value={filterMesPago}
                    onValueChange={setFilterMesPago}
                  >
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
                  <Label
                    htmlFor="filterSocioPago"
                    className="whitespace-nowrap"
                  >
                    Filtrar por socio:
                  </Label>
                  <Input
                    id="filterSocioPago"
                    value={filterSocioPago === "all" ? "" : filterSocioPago}
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
                    {Array.isArray(pagosServidor) &&
                    pagosServidor.length > 0 ? (
                      pagosServidor
                        .filter((pago: any) => {
                          const matchesDeporte = (() => {
                            if (filterDeportePago === "all") return true;
                            const cuotasDePago = cuotas.filter(
                              (c) => Number(c.pagoId) === Number(pago.id),
                            );
                            return cuotasDePago.some(
                              (c) =>
                                Number(c.deporteId) ===
                                Number(filterDeportePago),
                            );
                          })();

                          const matchesMes = (() => {
                            if (filterMesPago === "all") return true;
                            if (!pago.fechaPago) return false;
                            const mesPago =
                              new Date(pago.fechaPago).getMonth() + 1;
                            return mesPago === Number(filterMesPago);
                          })();

                          const matchesSocio = (() => {
                            if (filterSocioPago === "all" || !filterSocioPago)
                              return true;
                            const q = String(filterSocioPago)
                              .toLowerCase()
                              .trim();
                            const socio = personas.find(
                              (p) => Number(p.id) === Number(pago.socioId),
                            );
                            if (!socio) return false;
                            const nombreCompleto =
                              `${socio.nombre} ${socio.apellido}`.toLowerCase();
                            const dni = String(socio.dni || "").toLowerCase();
                            return (
                              nombreCompleto.includes(q) || dni.includes(q)
                            );
                          })();

                          return matchesDeporte && matchesMes && matchesSocio;
                        })
                        .map((pago: any) => {
                          const socio = personas.find(
                            (p) => Number(p.id) === Number(pago.socioId),
                          );
                          const cuotasDePago = cuotas.filter(
                            (c) => Number(c.pagoId) === Number(pago.id),
                          );
                          const cuotasDeportivasDePago = cuotasDePago.filter(
                            (c) => !c.esSocial,
                          );
                          const cuotasSocialesDePago = cuotasDePago.filter(
                            (c) => c.esSocial,
                          );
                          const deportesNombres = cuotasDeportivasDePago
                            .map((c) => {
                              const deporte = deportes.find(
                                (d) => Number(d.id) === Number(c.deporteId),
                              );
                              return deporte?.nombre || "Deporte desconocido";
                            })
                            .join(", ");
                          const conceptosPago = [
                            deportesNombres,
                            cuotasSocialesDePago.length > 0
                              ? "Cuota social independiente"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(", ");
                          const totalSocialIndependiente =
                            cuotasSocialesDePago.reduce(
                              (total, cuota) => total + (cuota.monto || 0),
                              0,
                            );
                          const isExpanded = expandedPagos.has(String(pago.id));
                          const desglosePorDeporte =
                            cuotasDeportivasDePago.reduce(
                              (acc, cuota) => {
                                const deporteId = Number(cuota.deporteId);
                                if (!acc[deporteId]) {
                                  const deporte = deportes.find(
                                    (d) => Number(d.id) === deporteId,
                                  );
                                  acc[deporteId] = {
                                    nombre:
                                      deporte?.nombre || "Deporte desconocido",
                                    entrenador: 0,
                                    seguro: 0,
                                    social: 0,
                                  };
                                }
                                acc[deporteId].entrenador +=
                                  cuota.cuotaEntrenador || 0;
                                acc[deporteId].seguro += cuota.cuotaSeguro || 0;
                                acc[deporteId].social += cuota.cuotaSocial || 0;
                                return acc;
                              },
                              {} as Record<
                                number,
                                {
                                  nombre: string;
                                  entrenador: number;
                                  seguro: number;
                                  social: number;
                                }
                              >,
                            );
                          const desgloseArray =
                            Object.values(desglosePorDeporte);
                          const hasConceptos =
                            totalSocialIndependiente > 0 ||
                            desgloseArray.some(
                              (d) => d.entrenador || d.seguro || d.social,
                            );

                          return (
                            <>
                              <TableRow
                                key={pago.id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() =>
                                  togglePagoExpanded(String(pago.id))
                                }
                              >
                                <TableCell>
                                  {hasConceptos ? (
                                    isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )
                                  ) : null}
                                </TableCell>
                                <TableCell>
                                  {socio
                                    ? `${socio.nombre} ${socio.apellido}`
                                    : "—"}
                                </TableCell>
                                <TableCell>{socio?.dni || "—"}</TableCell>
                                <TableCell>{conceptosPago || "—"}</TableCell>
                                <TableCell>
                                  ${(pago.montoTotal || 0).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  {formatearFechaDisplay(pago.fechaPago)}
                                </TableCell>
                                <TableCell>
                                  {pago.observaciones || "—"}
                                </TableCell>
                              </TableRow>
                              {isExpanded && hasConceptos && (
                                <TableRow
                                  key={`${pago.id}-desglose`}
                                  className="bg-gray-50"
                                >
                                  <TableCell colSpan={7} className="py-3 px-6">
                                    <div className="space-y-2">
                                      <p className="text-sm font-semibold text-gray-700">
                                        Desglose de conceptos:
                                      </p>
                                      <div className="space-y-3">
                                        {desgloseArray.map((d, idx) => (
                                          <div
                                            key={`${pago.id}-dep-${idx}`}
                                            className="rounded border bg-white p-3"
                                          >
                                            <div className="font-medium text-gray-700 mb-2">
                                              {d.nombre}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                              {d.entrenador > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">
                                                    Entrenador:
                                                  </span>
                                                  <span className="font-semibold">
                                                    $
                                                    {d.entrenador.toLocaleString()}
                                                  </span>
                                                </div>
                                              )}
                                              {d.seguro > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">
                                                    Seguro:
                                                  </span>
                                                  <span className="font-semibold">
                                                    ${d.seguro.toLocaleString()}
                                                  </span>
                                                </div>
                                              )}
                                              {d.social > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">
                                                    Social:
                                                  </span>
                                                  <span className="font-semibold">
                                                    ${d.social.toLocaleString()}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        {totalSocialIndependiente > 0 && (
                                          <div className="rounded border bg-white p-3">
                                            <div className="font-medium text-gray-700 mb-2">
                                              Cuota Social Independiente
                                            </div>
                                            <div className="text-sm flex items-center gap-2">
                                              <span className="text-gray-600">
                                                Social:
                                              </span>
                                              <span className="font-semibold">
                                                $
                                                {totalSocialIndependiente.toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {pago.montoTotal !==
                                        pago.cuotaEntrenador +
                                          pago.cuotaSeguro +
                                          pago.cuotaSocial && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          * El monto total puede diferir de la
                                          suma por promociones aplicadas
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
                        <TableCell
                          colSpan={7}
                          className="text-center text-gray-500"
                        >
                          No hay pagos registrados
                        </TableCell>
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
                      <CardDescription>
                        Resumen de pagos agrupados por socio
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      type="text"
                      placeholder="Buscar por nombre, apellido o DNI..."
                      value={searchIngresosPorSocio}
                      onChange={(e) =>
                        setSearchIngresosPorSocio(e.target.value)
                      }
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
                                $
                                {Number(item.totalPagado || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>{item.cantidadPagos}</TableCell>
                              <TableCell>
                                {item.ultimoPago
                                  ? new Date(
                                      item.ultimoPago,
                                    ).toLocaleDateString("es-ES")
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-gray-500"
                            >
                              No se encontraron resultados
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Listado y Reporte por Fecha o Rango */}
            <TabsContent value="ingresos-fecha" className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">
                      Consulta de Ingresos por Fecha o Período
                    </h3>
                    <p className="text-sm text-gray-500">
                      Consulta cuánto dinero ingresó por disciplina en un día
                      puntual o rango temporal.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        modoFiltroFecha === "dia" ? "default" : "outline"
                      }
                      onClick={() => setModoFiltroFecha("dia")}
                    >
                      Día puntual
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        modoFiltroFecha === "rango" ? "default" : "outline"
                      }
                      onClick={() => setModoFiltroFecha("rango")}
                    >
                      Período / Rango
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
                  <div className="flex flex-wrap items-end gap-3">
                    {modoFiltroFecha === "dia" ? (
                      <div className="space-y-1.5 w-44 min-w-[175px] shrink-0">
                        <Label htmlFor="filtro-fecha-dia">
                          Fecha del ingreso
                        </Label>
                        <Input
                          id="filtro-fecha-dia"
                          type="date"
                          value={fechaFiltro}
                          onChange={(e) => setFechaFiltro(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5 w-36 min-w-[150px] shrink-0">
                          <Label htmlFor="filtro-fecha-desde">
                            Fecha Desde
                          </Label>
                          <Input
                            id="filtro-fecha-desde"
                            type="date"
                            value={fechaDesdeFiltro}
                            onChange={(e) =>
                              setFechaDesdeFiltro(e.target.value)
                            }
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-1.5 w-36 min-w-[150px] shrink-0">
                          <Label htmlFor="filtro-fecha-hasta">
                            Fecha Hasta
                          </Label>
                          <Input
                            id="filtro-fecha-hasta"
                            type="date"
                            value={fechaHastaFiltro}
                            onChange={(e) =>
                              setFechaHastaFiltro(e.target.value)
                            }
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 min-w-[220px] w-fit shrink-0">
                      <Label htmlFor="filtro-deporte-ingreso">
                        Disciplina / Deporte
                      </Label>
                      <Popover
                        open={deporteIngresoAbierto}
                        onOpenChange={cambiarAperturaDeporteIngreso}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="filtro-deporte-ingreso"
                            type="button"
                            variant="outline"
                            aria-label={`Disciplina / Deporte: ${nombreDeporteIngreso}`}
                            className="w-full min-w-[220px] justify-between gap-2 font-normal"
                          >
                            <span>{nombreDeporteIngreso}</span>
                            <ChevronsUpDown
                              className="h-4 w-4 shrink-0 opacity-50"
                              aria-hidden="true"
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Buscar deporte..."
                              aria-label="Buscar disciplina o deporte"
                              value={busquedaDeporteIngreso}
                              onValueChange={setBusquedaDeporteIngreso}
                            />
                            <CommandList>
                              <CommandEmpty>
                                No se encontraron deportes.
                              </CommandEmpty>
                              <CommandGroup>
                                {opcionesDeporteIngresoFiltradas.map(
                                  (opcion) => (
                                    <CommandItem
                                      key={opcion.value}
                                      value={opcion.value}
                                      onSelect={() => {
                                        setFilterDeporteIngreso(opcion.value);
                                        cambiarAperturaDeporteIngreso(false);
                                      }}
                                    >
                                      {opcion.label}
                                    </CommandItem>
                                  ),
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={consultarIngresosPorFecha}
                      disabled={cargandoReporte}
                      className="gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {cargandoReporte ? "Consultando..." : "Buscar Ingresos"}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setModoFiltroFecha("dia");
                        setFechaFiltro(getFechaHoy());
                        setFechaDesdeFiltro("");
                        setFechaHastaFiltro("");
                        setFilterDeporteIngreso("all");
                        cambiarAperturaDeporteIngreso(false);
                        setResumenIngresos(null);
                        setPagosFiltrados([]);
                        setIngresosPorDeporte([]);
                      }}
                    >
                      Limpiar / Hoy
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportarCSVIngresosPorDeporte}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </div>

              {/* Resumen discriminado por Disciplina */}
              {ingresosPorDeporte.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Ingresos discriminados por Deporte
                    </CardTitle>
                    <CardDescription>
                      Detalle del dinero recaudado por cada disciplina en el
                      período seleccionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="border-t overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Deporte / Disciplina</TableHead>
                            <TableHead className="text-center">
                              Cuotas Cobradas
                            </TableHead>
                            <TableHead>Social</TableHead>
                            <TableHead>Entrenador</TableHead>
                            <TableHead>Seguro</TableHead>
                            <TableHead className="text-right">
                              Total Ingresado
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ingresosPorDeporte.map((item) => (
                            <TableRow key={`dep-${item.deporteId}`}>
                              <TableCell className="font-semibold">
                                {item.nombreDeporte}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.cantidadCuotasCobradas}
                              </TableCell>
                              <TableCell>
                                $
                                {Number(item.totalSocial || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                $
                                {Number(
                                  item.totalEntrenador || 0,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                $
                                {Number(item.totalSeguro || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-700">
                                ${Number(item.montoTotal || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableBody>
                          <TableRow className="border-0 hover:bg-transparent pointer-events-none">
                            <TableCell colSpan={6} className="py-2.5 border-0">
                              &nbsp;
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-t-2 bg-gray-50/80 font-bold">
                            <TableCell className="font-semibold">
                              Total
                            </TableCell>
                            <TableCell className="text-center">
                              {ingresosPorDeporte.reduce(
                                (acc, item) =>
                                  acc +
                                  (Number(item.cantidadCuotasCobradas) || 0),
                                0,
                              )}
                            </TableCell>
                            <TableCell>
                              $
                              {ingresosPorDeporte
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.totalSocial) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell>
                              $
                              {ingresosPorDeporte
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.totalEntrenador) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell>
                              $
                              {ingresosPorDeporte
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.totalSeguro) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-green-700 text-base">
                              $
                              {ingresosPorDeporte
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.montoTotal) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
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
                        const socio = personas.find(
                          (p) => Number(p.id) === Number(pago.socioId),
                        );
                        const cuotasDePago = cuotas.filter(
                          (c) => Number(c.pagoId) === Number(pago.id),
                        );
                        const deportesNombres =
                          cuotasDePago
                            .map((c) => {
                              const deporte = deportes.find(
                                (d) => Number(d.id) === Number(c.deporteId),
                              );
                              return deporte?.nombre || "Deporte";
                            })
                            .filter(Boolean)
                            .join(", ") || "—";

                        return (
                          <TableRow key={`filtro-${pago.id}`}>
                            <TableCell className="font-medium">
                              {socio
                                ? `${socio.nombre} ${socio.apellido}`
                                : "—"}
                            </TableCell>
                            <TableCell>{socio?.dni || "—"}</TableCell>
                            <TableCell>{deportesNombres}</TableCell>
                            <TableCell className="font-semibold text-green-700">
                              ${(pago.montoTotal || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getMetodoPagoLabel(pago.metodoPago)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatearFechaDisplay(pago.fechaPago)}
                            </TableCell>
                            <TableCell>{pago.observaciones || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-6 text-gray-500"
                        >
                          {cargandoReporte
                            ? "Buscando ingresos..."
                            : "No se encontraron ingresos registrados para el criterio seleccionado."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Pestaña Resumen Mensual */}
            <TabsContent value="resumen-mensual" className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">
                      Resumen Mensual por Disciplina
                    </h3>
                    <p className="text-sm text-gray-500">
                      Liquidación mensual por período: socios al día, deudores y
                      montos cobrados vs adeudados.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5 w-40 min-w-[150px] shrink-0">
                      <Label htmlFor="resumen-mes">Mes</Label>
                      <Select value={mesResumen} onValueChange={setMesResumen}>
                        <SelectTrigger id="resumen-mes" className="w-full">
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          {mesesNombres.map((m, idx) => (
                            <SelectItem key={idx + 1} value={String(idx + 1)}>
                              {m.charAt(0).toUpperCase() + m.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 w-28 min-w-[100px] shrink-0">
                      <Label htmlFor="resumen-anio">Año</Label>
                      <Input
                        id="resumen-anio"
                        type="number"
                        min="2020"
                        max="2035"
                        value={anioResumen}
                        onChange={(e) => setAnioResumen(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-[220px] w-fit shrink-0">
                      <Label htmlFor="resumen-deporte">
                        Disciplina / Deporte
                      </Label>
                      <Popover
                        open={deporteResumenAbierto}
                        onOpenChange={cambiarAperturaDeporteResumen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="resumen-deporte"
                            type="button"
                            variant="outline"
                            aria-label={`Disciplina / Deporte: ${nombreDeporteResumen}`}
                            className="w-full min-w-[220px] justify-between gap-2 font-normal"
                          >
                            <span>{nombreDeporteResumen}</span>
                            <ChevronsUpDown
                              className="h-4 w-4 shrink-0 opacity-50"
                              aria-hidden="true"
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Buscar deporte..."
                              aria-label="Buscar disciplina o deporte"
                              value={busquedaDeporteResumen}
                              onValueChange={setBusquedaDeporteResumen}
                            />
                            <CommandList>
                              <CommandEmpty>
                                No se encontraron deportes.
                              </CommandEmpty>
                              <CommandGroup>
                                {opcionesDeporteResumenFiltradas.map(
                                  (opcion) => (
                                    <CommandItem
                                      key={opcion.value}
                                      value={opcion.value}
                                      onSelect={() => {
                                        setFilterDeporteResumen(opcion.value);
                                        cambiarAperturaDeporteResumen(false);
                                      }}
                                    >
                                      {opcion.label}
                                    </CommandItem>
                                  ),
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={consultarResumenMensual}
                      disabled={cargandoResumenMensual}
                      className="gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {cargandoResumenMensual
                        ? "Consultando..."
                        : "Consultar Resumen"}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        const hoy = new Date();
                        setMesResumen(String(hoy.getMonth() + 1));
                        setAnioResumen(String(hoy.getFullYear()));
                        setFilterDeporteResumen("all");
                        cambiarAperturaDeporteResumen(false);
                        setResumenMensual([]);
                      }}
                    >
                      Limpiar / Mes Actual
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportarCSVResumenMensual}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </div>

              {resumenMensual.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Liquidación de{" "}
                      {mesesNombres[parseInt(mesResumen, 10) - 1] || mesResumen}{" "}
                      {anioResumen}
                    </CardTitle>
                    <CardDescription>
                      Detalle de socios al día, deudores y montos
                      correspondientes a las cuotas del período
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="border-t overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Deporte / Disciplina</TableHead>
                            <TableHead className="text-center">
                              Socios Al Día
                            </TableHead>
                            <TableHead className="text-center">
                              Socios Deudores
                            </TableHead>
                            <TableHead>Social</TableHead>
                            <TableHead>Entrenador</TableHead>
                            <TableHead>Seguro</TableHead>
                            <TableHead className="text-right">
                              Total Cobrado
                            </TableHead>
                            <TableHead className="text-right">
                              Total Adeudado
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resumenMensual.map((item) => (
                            <TableRow key={`resumen-dep-${item.deporteId}`}>
                              <TableCell className="font-semibold">
                                {item.nombreDeporte}
                              </TableCell>
                              <TableCell className="text-center font-medium text-blue-700">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {item.sociosAlDia}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-medium text-amber-700">
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  {item.sociosDeudores}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                $
                                {Number(
                                  item.cobradoSocial || 0,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                $
                                {Number(
                                  item.cobradoEntrenador || 0,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                $
                                {Number(
                                  item.cobradoSeguro || 0,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-700">
                                $
                                {Number(
                                  item.totalCobrado || 0,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-bold text-red-600">
                                $
                                {Number(
                                  item.totalAdeudado || 0,
                                ).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableBody>
                          <TableRow className="border-0 hover:bg-transparent pointer-events-none">
                            <TableCell colSpan={8} className="py-2.5 border-0">
                              &nbsp;
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-t-2 bg-gray-50/80 font-bold">
                            <TableCell className="font-semibold">
                              Total
                            </TableCell>
                            <TableCell className="text-center">
                              {resumenMensual.reduce(
                                (acc, item) =>
                                  acc + (Number(item.sociosAlDia) || 0),
                                0,
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {resumenMensual.reduce(
                                (acc, item) =>
                                  acc + (Number(item.sociosDeudores) || 0),
                                0,
                              )}
                            </TableCell>
                            <TableCell>
                              $
                              {resumenMensual
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.cobradoSocial) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell>
                              $
                              {resumenMensual
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.cobradoEntrenador) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell>
                              $
                              {resumenMensual
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.cobradoSeguro) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-green-700 text-base">
                              $
                              {resumenMensual
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.totalCobrado) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-red-600 text-base">
                              $
                              {resumenMensual
                                .reduce(
                                  (acc, item) =>
                                    acc + (Number(item.totalAdeudado) || 0),
                                  0,
                                )
                                .toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg p-8 text-center text-gray-500">
                  {cargandoResumenMensual
                    ? "Consultando resumen mensual..."
                    : "Selecciona un mes, año y disciplina para consultar el resumen mensual."}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
