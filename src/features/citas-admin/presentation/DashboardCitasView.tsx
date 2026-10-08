"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACBadge } from "@/shared/ui";
import { CitaAdminItem, EstadoCita } from "../domain/entities";
import {
  Calendar,
  CalendarCheck2,
  DollarSign,
  TrendingUp,
  UserCheck,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Search,
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
  cargando = false,
  error,
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");

  // Métricas calculadas
  const totalCitas = citas.length;
  const confirmadas = citas.filter((c) => c.estado === "confirmada").length;
  const completadas = citas.filter((c) => c.estado === "completada").length;
  const canceladas = citas.filter((c) => c.estado === "cancelada").length;

  const ingresosCentavos = citas
    .filter((c) => c.estado === "confirmada" || c.estado === "completada")
    .reduce((sum, c) => sum + c.precioCentavos, 0);

  const tasaEfectividad =
    totalCitas > 0
      ? Math.round(((confirmadas + completadas) / totalCitas) * 100)
      : 100;

  const citasFiltradas = citas.filter((c) => {
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
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Agenda de Citas
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Supervisa reservaciones, estados y métricas de rendimiento en tiempo real
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200/90 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Métricas / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Citas Totales */}
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
              {confirmadas}
            </span>
            <span className="text-xs text-zinc-400">de {totalCitas} totales</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ACBadge variante="neutral" className="text-[10px]">
              {completadas} completadas
            </ACBadge>
            {canceladas > 0 && (
              <ACBadge variante="peligro" className="text-[10px]">
                {canceladas} canceladas
              </ACBadge>
            )}
          </div>
        </div>

        {/* KPI 2: Ingresos Estimados */}
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
              ${(ingresosCentavos / 100).toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> proyectado
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Cálculo sobre citas confirmadas y realizadas
          </p>
        </div>

        {/* KPI 3: Tasa de Efectividad */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Tasa de Asistencia
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              {tasaEfectividad}%
            </span>
            <span className="text-xs text-zinc-400">efectividad</span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Porcentaje de citas cumplidas sin cancelación
          </p>
        </div>
      </div>

      {/* Contenedor Principal: Filtros + Listado */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {/* Barra superior de pestañas de filtro */}
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-50/50">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl text-xs">
            {[
              { id: "todas", label: "Todas", count: totalCitas },
              { id: "confirmada", label: "Confirmadas", count: confirmadas },
              { id: "completada", label: "Completadas", count: completadas },
              { id: "cancelada", label: "Canceladas", count: canceladas },
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

        {/* Lista de citas */}
        {citasFiltradas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800">
              No hay citas en esta categoría
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              No se encontraron citas con el filtro seleccionado. Selecciona otra categoría o espera nuevas reservas en tu página pública.
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
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold flex items-center justify-center">
                          {iniciales}
                        </div>
                        <span className="font-bold text-zinc-900 text-base tracking-tight">
                          {c.clienteNombre}
                        </span>

                        {/* Badge de Estado */}
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
    </div>
  );
};
