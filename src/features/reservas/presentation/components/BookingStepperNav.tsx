"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  PasoReserva,
  PASOS_RESERVA,
  EstadoCompletoStepper,
  determinarEstadoPaso,
  puedeNavegarAPaso,
  calcularProgresoPorcentaje,
} from "../../domain/stepperReserva";

interface BookingStepperNavProps {
  pasoActual: PasoReserva;
  estado: EstadoCompletoStepper;
  onCambiarPaso: (paso: PasoReserva) => void;
}

export const BookingStepperNav: React.FC<BookingStepperNavProps> = ({
  pasoActual,
  estado,
  onCambiarPaso,
}) => {
  const progresoPorcentaje = calcularProgresoPorcentaje(pasoActual);
  const pasoActualDef = PASOS_RESERVA.find((p) => p.numero === pasoActual);

  return (
    <nav
      aria-label="Progreso de la reserva"
      className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs mb-6"
    >
      {/* Vista Móvil: Barra compacta y contador de paso */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-zinc-500">
            Paso {pasoActual} de 3
          </span>
          <span className="text-zinc-900 font-bold">
            {pasoActualDef?.titulo}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progresoPorcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso de la reserva: ${progresoPorcentaje}%`}
          className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden"
        >
          <div
            className="bg-zinc-900 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progresoPorcentaje}%` }}
          />
        </div>
      </div>

      {/* Vista Desktop / Tablet: Stepper horizontal interactivo completo */}
      <ol role="list" className="hidden md:flex items-center w-full justify-between">
        {PASOS_RESERVA.map((paso, index) => {
          const estadoPaso = determinarEstadoPaso(paso.numero, pasoActual, estado);
          const esActivo = paso.numero === pasoActual;
          const esCompletado = estadoPaso === "completado";
          const puedeNavegar = puedeNavegarAPaso(paso.numero, estado);
          const noEsUltimo = index < PASOS_RESERVA.length - 1;

          return (
            <React.Fragment key={paso.numero}>
              <li className="flex items-center gap-3 relative flex-1">
                <button
                  type="button"
                  onClick={() => puedeNavegar && onCambiarPaso(paso.numero)}
                  disabled={!puedeNavegar}
                  aria-current={esActivo ? "step" : undefined}
                  aria-disabled={!puedeNavegar}
                  className={`group flex items-center gap-3 text-left transition-all duration-150 rounded-xl p-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
                    puedeNavegar
                      ? "cursor-pointer hover:bg-zinc-50"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  {/* Círculo indicador */}
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-200 ${
                      esCompletado
                        ? "bg-emerald-600 text-white shadow-xs"
                        : esActivo
                        ? "bg-zinc-900 text-white ring-4 ring-zinc-900/10 shadow-xs"
                        : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                    }`}
                  >
                    {esCompletado ? (
                      <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    ) : (
                      <span>{paso.numero}</span>
                    )}
                  </span>

                  {/* Textos descriptivos del paso */}
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        esActivo
                          ? "text-zinc-900"
                          : esCompletado
                          ? "text-emerald-700"
                          : "text-zinc-500"
                      }`}
                    >
                      {paso.titulo}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-normal hidden lg:inline">
                      {paso.subtitulo}
                    </span>
                  </div>
                </button>

                {/* Línea conectora entre pasos */}
                {noEsUltimo && (
                  <div
                    aria-hidden="true"
                    className="flex-1 mx-3 h-0.5 bg-zinc-200/80 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        esCompletado || pasoActual > paso.numero
                          ? "bg-emerald-600 w-full"
                          : "bg-transparent w-0"
                      }`}
                    />
                  </div>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
