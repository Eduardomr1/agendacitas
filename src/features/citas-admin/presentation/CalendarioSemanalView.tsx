"use client";

import React from "react";
import { CitaAdminItem } from "../domain/entities";
import {
  obtenerDiasDeSemana,
  formatearRangoSemana,
  esMismoDia,
} from "../domain/metricasCitas";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { ACButton } from "@/shared/ui";

interface CalendarioSemanalViewProps {
  citas: CitaAdminItem[];
  fechaReferencia: Date;
  onCambiarSemana: (nuevaFecha: Date) => void;
  onSeleccionarCita: (cita: CitaAdminItem) => void;
}

const HORAS_DEL_DIA = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

const NOMBRES_DIAS_CORTO = [
  "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb",
];

export const CalendarioSemanalView: React.FC<CalendarioSemanalViewProps> = ({
  citas,
  fechaReferencia,
  onCambiarSemana,
  onSeleccionarCita,
}) => {
  const diasSemana = obtenerDiasDeSemana(fechaReferencia);
  const [hoy, setHoy] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setHoy(new Date());
  }, []);

  const irSemanaAnterior = () => {
    const d = new Date(fechaReferencia);
    d.setDate(d.getDate() - 7);
    onCambiarSemana(d);
  };

  const irSemanaSiguiente = () => {
    const d = new Date(fechaReferencia);
    d.setDate(d.getDate() + 7);
    onCambiarSemana(d);
  };

  const irAHoy = () => {
    onCambiarSemana(new Date());
  };

  // Filtrar citas que caigan en la semana visible
  const citasSemana = citas.filter((c) => {
    const fechaCita = new Date(c.inicio);
    return diasSemana.some((dia) => esMismoDia(dia, fechaCita));
  });

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden select-none">
      {/* Cabecera de controles de semana */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 capitalize">
              {formatearRangoSemana(diasSemana)}
            </h3>
            <p className="text-xs text-zinc-500">
              {citasSemana.length}{" "}
              {citasSemana.length === 1 ? "cita programada" : "citas programadas"}{" "}
              en esta semana
            </p>
          </div>
        </div>

        {/* Botones de navegación semanal */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-between sm:justify-end">
          <ACButton
            type="button"
            variante="secundario"
            onClick={irAHoy}
            className="text-xs px-3 py-1.5 min-h-[34px]"
          >
            Hoy
          </ACButton>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={irSemanaAnterior}
              className="w-8 h-8 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 flex items-center justify-center transition-colors"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={irSemanaSiguiente}
              className="w-8 h-8 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 flex items-center justify-center transition-colors"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid del calendario semanal */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Cabecera de columnas (Días de la semana) */}
          <div className="grid grid-cols-8 border-b border-zinc-100 bg-zinc-50/80 text-center">
            {/* Espacio para la columna de hora */}
            <div className="p-3 text-xs font-semibold text-zinc-400 border-r border-zinc-100 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>

            {/* Columnas de los 7 días */}
            {diasSemana.map((dia) => {
              const esHoy = hoy ? esMismoDia(dia, hoy) : false;
              const diaSemanaNombre = NOMBRES_DIAS_CORTO[dia.getDay()];
              return (
                <div
                  key={dia.toISOString()}
                  className={`p-3 border-r border-zinc-100 last:border-r-0 ${
                    esHoy ? "bg-blue-50/50" : ""
                  }`}
                >
                  <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {diaSemanaNombre}
                  </span>
                  <span
                    className={`inline-block mt-0.5 text-sm font-extrabold px-2 py-0.5 rounded-full ${
                      esHoy
                        ? "bg-zinc-900 text-white shadow-2xs"
                        : "text-zinc-800"
                    }`}
                  >
                    {dia.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Filas horarias */}
          <div className="divide-y divide-zinc-100">
            {HORAS_DEL_DIA.map((hora) => {
              const horaTexto = `${String(hora).padStart(2, "0")}:00`;
              return (
                <div key={hora} className="grid grid-cols-8 min-h-[72px]">
                  {/* Etiqueta de la hora */}
                  <div className="p-2 border-r border-zinc-100 text-center text-[11px] font-medium text-zinc-400 bg-zinc-50/30 flex items-start justify-center pt-2">
                    {horaTexto}
                  </div>

                  {/* Celdas para cada día en esta hora */}
                  {diasSemana.map((dia) => {
                    const esHoy = hoy ? esMismoDia(dia, hoy) : false;
                    // Citas que caen en este día y en esta hora
                    const citasEnSlot = citas.filter((c) => {
                      const f = new Date(c.inicio);
                      return esMismoDia(f, dia) && f.getHours() === hora;
                    });

                    return (
                      <div
                        key={dia.toISOString()}
                        className={`p-1.5 border-r border-zinc-100 last:border-r-0 relative transition-colors ${
                          esHoy ? "bg-blue-50/20" : ""
                        }`}
                      >
                        {citasEnSlot.map((cita) => {
                          const horaInicio = new Date(cita.inicio).toLocaleTimeString(
                            "es-MX",
                            { hour: "2-digit", minute: "2-digit" }
                          );

                          // Estilos según el estado
                          let badgeEstilo =
                            "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100/90";
                          if (cita.estado === "completada") {
                            badgeEstilo =
                              "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100/90";
                          } else if (cita.estado === "cancelada") {
                            badgeEstilo =
                              "bg-zinc-100 text-zinc-500 border-zinc-200 line-through opacity-70";
                          }

                          return (
                            <button
                              key={cita.id}
                              type="button"
                              onClick={() => onSeleccionarCita(cita)}
                              className={`w-full text-left p-2 rounded-xl border mb-1 transition-all shadow-2xs cursor-pointer block ${badgeEstilo}`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span>{horaInicio}</span>
                                <span className="opacity-75">{cita.duracionMin}m</span>
                              </div>
                              <p className="text-xs font-extrabold truncate mt-0.5 leading-tight">
                                {cita.clienteNombre}
                              </p>
                              <p className="text-[10px] truncate opacity-85 mt-0.5">
                                {cita.servicioNombre}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/60 flex flex-wrap items-center justify-between text-xs text-zinc-500 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-zinc-700">Estados:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Completada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
            <span>Cancelada</span>
          </div>
        </div>

        <span className="text-[11px] text-zinc-400 italic">
          Haz clic en cualquier cita para ver detalles o cambiar su estado
        </span>
      </div>
    </div>
  );
};
