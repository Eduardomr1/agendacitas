"use client";

import React, { useState } from "react";
import { ACButton, ACBadge, ACInput } from "@/shared/ui";
import { CitaAdminItem, EstadoCita } from "../domain/entities";
import { calcularMetricasCitas } from "../domain/metricasCitas";
import { CalendarioSemanalView } from "./CalendarioSemanalView";
import { DetalleCitaModal } from "./DetalleCitaModal";
import {
  Calendar,
  CalendarCheck2,
  CalendarDays,
  DollarSign,
  TrendingUp,
  UserCheck,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  List,
  Eye,
} from "lucide-react";

interface DashboardCitasViewProps {
  citas: CitaAdminItem[];
  onCambiarEstado: (id: string, nuevoEstado: EstadoCita) => Promise<void>;
  cargando?: boolean;
  error?: string;
}

export const DashboardCitasView: React.FC<DashboardCitasViewProps> = ({
  citas,
  onCambiarEstado,
  error,
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [vistaActual, setVistaActual] = useState<"lista" | "calendario">("calendario");
  const [fechaSemana, setFechaSemana] = useState<Date>(
    () => (citas[0] ? new Date(citas[0].inicio) : new Date(2026, 9, 9))
  );
  const [citaModal, setCitaModal] = useState<CitaAdminItem | null>(null);

  React.useEffect(() => {
    setFechaSemana(new Date());
  }, []);

  // Métricas avanzadas calculadas por lógica de dominio
  const metricas = calcularMetricasCitas(citas);

  // Filtrado compuesto: búsqueda en texto + estado
  const citasFiltradasPorBusqueda = citas.filter((c) => {
    if (!busqueda.trim()) return true;
    const termino = busqueda.toLowerCase().trim();
    return (
      c.clienteNombre.toLowerCase().includes(termino) ||
      c.clienteEmail.toLowerCase().includes(termino) ||
      (c.clienteTelefono && c.clienteTelefono.includes(termino)) ||
      c.servicioNombre.toLowerCase().includes(termino)
    );
  });

  const citasFiltradas = citasFiltradasPorBusqueda.filter((c) => {
    if (filtroEstado === "todas") return true;
    return c.estado === filtroEstado;
  });

  const formatearFecha = (d: Date) => {
    const fecha = new Date(d);
    return fecha.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatearHora = (d: Date) => {
    const fecha = new Date(d);
    return fecha.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const obtenerIniciales = (nombre: string) => {
    return nombre
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal y Selector de Vista */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Agenda de Citas
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Supervisa reservaciones, estados y métricas de rendimiento en tiempo real
          </p>
        </div>

        {/* Toggle de vistas: Lista vs Calendario Semanal */}
        <div className="flex items-center p-1 bg-zinc-200/70 rounded-xl text-xs font-semibold self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setVistaActual("calendario")}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-150 ${
              vistaActual === "calendario"
                ? "bg-white text-zinc-900 shadow-2xs font-bold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendario Semanal</span>
          </button>
          <button
            type="button"
            onClick={() => setVistaActual("lista")}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-150 ${
              vistaActual === "lista"
                ? "bg-white text-zinc-900 shadow-2xs font-bold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <List className="w-4 h-4" />
            <span>Lista de Citas</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200/90 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Métricas / KPIs Avanzados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Citas Activas */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Citas Activas
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              {metricas.confirmadas}
            </span>
            <span className="text-xs text-zinc-400">de {metricas.totalCitas} totales</span>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <ACBadge variante="neutral" className="text-[10px]">
              {metricas.completadas} completadas
            </ACBadge>
            {metricas.canceladas > 0 && (
              <ACBadge variante="peligro" className="text-[10px]">
                {metricas.canceladas} canceladas
              </ACBadge>
            )}
          </div>
        </div>

        {/* KPI 2: Ingresos Estimados & Ticket Promedio */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Ingresos Estimados
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              ${(metricas.ingresosCentavos / 100).toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> proyectado
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-500 flex items-center justify-between">
            <span>Ticket promedio:</span>
            <strong className="text-zinc-800">
              ${(metricas.ticketPromedioCentavos / 100).toFixed(2)} MXN
            </strong>
          </p>
        </div>

        {/* KPI 3: Tasa de Asistencia & Clientes Recurrentes */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Asistencia & Clientes
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              {metricas.tasaEfectividad}%
            </span>
            <span className="text-xs text-zinc-400">asistencia</span>
          </div>
          <p className="mt-3 text-xs text-zinc-500 flex items-center justify-between">
            <span>Clientes recurrentes:</span>
            <strong className="text-zinc-800">
              {metricas.clientesRecurrentes} ({metricas.tasaRecurrencia}%)
            </strong>
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda Global */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
        <ACInput
          placeholder="Buscar por cliente, correo, teléfono o servicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          iconoIzquierda={<Search className="w-4 h-4" />}
          className="bg-zinc-50/50"
        />
      </div>

      {/* Renderizado condicional según vista activa */}
      {vistaActual === "calendario" ? (
        <CalendarioSemanalView
          citas={citasFiltradasPorBusqueda}
          fechaReferencia={fechaSemana}
          onCambiarSemana={setFechaSemana}
          onSeleccionarCita={(cita) => setCitaModal(cita)}
        />
      ) : (
        /* Vista de Lista Tradicional */
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {/* Barra superior de pestañas de filtro */}
          <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-50/50">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl text-xs">
              {[
                { id: "todas", label: "Todas", count: citasFiltradasPorBusqueda.length },
                {
                  id: "confirmada",
                  label: "Confirmadas",
                  count: citasFiltradasPorBusqueda.filter((c) => c.estado === "confirmada").length,
                },
                {
                  id: "completada",
                  label: "Completadas",
                  count: citasFiltradasPorBusqueda.filter((c) => c.estado === "completada").length,
                },
                {
                  id: "cancelada",
                  label: "Canceladas",
                  count: citasFiltradasPorBusqueda.filter((c) => c.estado === "cancelada").length,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroEstado(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 ${
                    filtroEstado === f.id
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      filtroEstado === f.id
                        ? "bg-zinc-100 text-zinc-800 font-bold"
                        : "bg-zinc-300/60 text-zinc-600"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-xs text-zinc-400">
              Mostrando <strong>{citasFiltradas.length}</strong> reservaciones
            </span>
          </div>

          {/* Listado de Citas */}
          {citasFiltradas.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800">
                No hay citas en este criterio
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No se encontraron citas con los filtros o búsqueda actuales.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {citasFiltradas.map((c) => {
                const iniciales = obtenerIniciales(c.clienteNombre);
                return (
                  <div
                    key={c.id}
                    className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Chip de Fecha y Hora */}
                      <div className="bg-zinc-900 text-white rounded-xl p-2.5 text-center min-w-[90px] shadow-2xs shrink-0">
                        <span className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-300">
                          {formatearFecha(c.inicio)}
                        </span>
                        <span className="block text-base font-extrabold mt-0.5 tracking-tight">
                          {formatearHora(c.inicio)}
                        </span>
                      </div>

                      {/* Datos del Cliente y Servicio */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold flex items-center justify-center">
                            {iniciales}
                          </div>
                          <span className="font-bold text-zinc-900 text-base tracking-tight">
                            {c.clienteNombre}
                          </span>

                          {c.estado === "confirmada" && (
                            <ACBadge variante="exito">Confirmada</ACBadge>
                          )}
                          {c.estado === "completada" && (
                            <ACBadge variante="neutral">Completada</ACBadge>
                          )}
                          {c.estado === "cancelada" && (
                            <ACBadge variante="peligro">Cancelada</ACBadge>
                          )}
                        </div>

                        {/* Servicio y Precio */}
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 flex-wrap">
                          <span className="text-zinc-900 font-semibold">
                            {c.servicioNombre}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {c.duracionMin} min
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60">
                            ${(c.precioCentavos / 100).toFixed(2)}
                          </span>
                        </div>

                        {/* Contacto del Cliente */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500 pt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-zinc-400" />
                            {c.clienteEmail}
                          </span>
                          {c.clienteTelefono && (
                            <>
                              <span className="text-zinc-300">•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-zinc-400" />
                                {c.clienteTelefono}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setCitaModal(c)}
                        className="w-8 h-8 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-600 flex items-center justify-center transition-colors mr-1"
                        title="Ver detalle completo"
                        aria-label="Ver detalle completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {c.estado === "confirmada" && (
                        <>
                          <ACButton
                            type="button"
                            variante="secundario"
                            iconoIzquierda={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            onClick={() => onCambiarEstado(c.id, "completada")}
                            className="text-xs min-h-[34px] py-1 px-3"
                          >
                            Completar
                          </ACButton>
                          <ACButton
                            type="button"
                            variante="fantasma"
                            iconoIzquierda={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                            onClick={() => onCambiarEstado(c.id, "cancelada")}
                            className="text-xs min-h-[34px] py-1 px-3 text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            Cancelar
                          </ACButton>
                        </>
                      )}

                      {c.estado === "cancelada" && (
                        <ACButton
                          type="button"
                          variante="secundario"
                          iconoIzquierda={<RotateCcw className="w-3.5 h-3.5 text-zinc-600" />}
                          onClick={() => onCambiarEstado(c.id, "confirmada")}
                          className="text-xs min-h-[34px] py-1 px-3"
                        >
                          Reactivar Cita
                        </ACButton>
                      )}

                      {c.estado === "completada" && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1 pr-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Atendida
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle de Cita */}
      <DetalleCitaModal
        cita={citaModal}
        onCerrar={() => setCitaModal(null)}
        onCambiarEstado={onCambiarEstado}
      />
    </div>
  );
};
