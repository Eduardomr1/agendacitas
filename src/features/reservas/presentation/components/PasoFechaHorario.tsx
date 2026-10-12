"use client";

import React from "react";
import { ACCalendar, ACCard, ACButton } from "@/shared/ui";
import { Clock, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { formatearFechaLegible } from "../../domain/stepperReserva";

interface PasoFechaHorarioProps {
  fechaSeleccionada: string;
  slotSeleccionado?: string;
  slotsDisponibles: string[];
  fechaMinima?: string;
  duracionMin?: number;
  zonaHoraria?: string;
  onSeleccionarFecha: (fecha: string) => void;
  onSeleccionarSlot: (slot: string) => void;
  onAtras: () => void;
  onContinuar: () => void;
}

export const PasoFechaHorario: React.FC<PasoFechaHorarioProps> = ({
  fechaSeleccionada,
  slotSeleccionado,
  slotsDisponibles,
  fechaMinima,
  duracionMin = 30,
  zonaHoraria = "America/Hermosillo",
  onSeleccionarFecha,
  onSeleccionarSlot,
  onAtras,
  onContinuar,
}) => {
  const haySlotSeleccionado = !!slotSeleccionado;
  const fechaTextoLegible = formatearFechaLegible(fechaSeleccionada);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Calendario para selección de fecha */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 px-1">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
            1. Selecciona la Fecha
          </label>
          <ACCalendar
            fechaSeleccionada={fechaSeleccionada}
            onSeleccionarFecha={onSeleccionarFecha}
            fechaMinima={fechaMinima}
          />
        </div>

        {/* Cuadrícula interactiva de slots disponibles */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 px-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            2. Selecciona el Horario
          </label>
          <ACCard
            titulo={fechaTextoLegible || "Selecciona un día"}
            subtitulo={`Duración: ${duracionMin} min • Zona: ${zonaHoraria}`}
            className="p-5"
          >
            {slotsDisponibles.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-700 mb-1">
                  Sin horarios disponibles
                </p>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  No hay turnos libres para esta fecha. Por favor selecciona otro día en el calendario.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-zinc-500 mb-3">
                  Horarios disponibles para la fecha seleccionada:
                </p>
                <div
                  role="radiogroup"
                  aria-label={`Horarios disponibles para ${fechaTextoLegible}`}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[320px] overflow-y-auto pr-1"
                >
                  {slotsDisponibles.map((slot) => {
                    const esActivo = slot === slotSeleccionado;
                    return (
                      <button
                        type="button"
                        key={slot}
                        role="radio"
                        aria-checked={esActivo}
                        onClick={() => onSeleccionarSlot(slot)}
                        className={`min-h-[44px] py-2.5 px-3 text-xs font-bold font-mono rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
                          esActivo
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                            : "bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        {esActivo && (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>{slot}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </ACCard>
        </div>
      </div>

      {/* Barra de navegación inferior */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <ACButton
          type="button"
          variante="contorno"
          onClick={onAtras}
          iconoIzquierda={<ArrowLeft className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Atrás (Cambiar Servicio)
        </ACButton>

        <ACButton
          type="button"
          variante="primario"
          disabled={!haySlotSeleccionado}
          onClick={onContinuar}
          iconoDerecha={<ArrowRight className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Continuar a Tus Datos
        </ACButton>
      </div>
    </div>
  );
};
