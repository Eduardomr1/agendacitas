"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ACCalendarProps {
  fechaSeleccionada: string; // "YYYY-MM-DD"
  onSeleccionarFecha: (fecha: string) => void;
  fechaMinima?: string; // "YYYY-MM-DD"
  diasInactivos?: number[]; // [0] para domingos inactivos
  className?: string;
}

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_CABECERA = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export function formatearFechaISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function obtenerDiasDelMes(ano: number, mes: number) {
  // mes: 0-11
  const primerDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const dias = [];
  // Espacios vacíos antes del primer día del mes
  for (let i = 0; i < primerDia.getDay(); i++) {
    dias.push(null);
  }

  // Días del mes
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    dias.push(new Date(ano, mes, d));
  }

  return dias;
}

export const ACCalendar: React.FC<ACCalendarProps> = ({
  fechaSeleccionada,
  onSeleccionarFecha,
  fechaMinima,
  diasInactivos = [],
  className = "",
}) => {
  const fechaInicial = fechaSeleccionada
    ? new Date(`${fechaSeleccionada}T00:00:00`)
    : new Date();

  const [mesActual, setMesActual] = useState(fechaInicial.getMonth());
  const [anoActual, setAnoActual] = useState(fechaInicial.getFullYear());

  const dias = obtenerDiasDelMes(anoActual, mesActual);

  const irAlMesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAnoActual((a) => a - 1);
    } else {
      setMesActual((m) => m - 1);
    }
  };

  const irAlMesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAnoActual((a) => a + 1);
    } else {
      setMesActual((m) => m + 1);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs select-none ${className}`}
    >
      {/* Navegación de mes y año */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
        <h4 className="text-sm font-bold text-zinc-900 tracking-tight">
          {NOMBRES_MESES[mesActual]} {anoActual}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={irAlMesAnterior}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={irAlMesSiguiente}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {DIAS_CABECERA.map((d) => (
          <span
            key={d}
            className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider py-1"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7 gap-1">
        {dias.map((d, index) => {
          if (!d) {
            return <div key={`empty-${index}`} className="h-9 w-9" />;
          }

          const fechaIso = formatearFechaISO(d);
          const esSeleccionado = fechaIso === fechaSeleccionada;
          const esInactivoPorDia = diasInactivos.includes(d.getDay());
          const esPasado = fechaMinima ? fechaIso < fechaMinima : false;
          const deshabilitado = esInactivoPorDia || esPasado;

          return (
            <button
              key={fechaIso}
              type="button"
              disabled={deshabilitado}
              onClick={() => onSeleccionarFecha(fechaIso)}
              className={`h-9 w-9 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer ${
                esSeleccionado
                  ? "bg-zinc-900 text-white shadow-sm scale-105"
                  : deshabilitado
                  ? "text-zinc-300 cursor-not-allowed bg-transparent"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
