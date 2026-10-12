"use client";

import React from "react";
import { ServicioPublico } from "../../domain/entities";
import { ACCard, ACButton } from "@/shared/ui";
import { Clock, Check, ArrowRight, Tag } from "lucide-react";
import { formatearPrecio } from "../../domain/stepperReserva";

interface PasoServiciosProps {
  servicios: ServicioPublico[];
  servicioSeleccionadoId?: string;
  onSeleccionarServicio: (servicioId: string) => void;
  onContinuar: () => void;
}

export const PasoServicios: React.FC<PasoServiciosProps> = ({
  servicios,
  servicioSeleccionadoId,
  onSeleccionarServicio,
  onContinuar,
}) => {
  const hayServicioSeleccionado = !!servicioSeleccionadoId;

  return (
    <ACCard
      titulo="1. Elige un servicio"
      subtitulo="Selecciona la atención que deseas agendar para continuar"
      className="p-6 md:p-8"
    >
      <div
        role="radiogroup"
        aria-label="Catálogo de servicios disponibles"
        className="grid grid-cols-1 gap-3.5 mb-6"
      >
        {servicios.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl">
            <Tag className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-500">
              No hay servicios disponibles en este momento.
            </p>
          </div>
        ) : (
          servicios.map((s) => {
            const esSeleccionado = s.id === servicioSeleccionadoId;

            return (
              <div
                key={s.id}
                role="radio"
                tabIndex={0}
                aria-checked={esSeleccionado}
                aria-label={`${s.nombre}, duración ${s.duracionMin} minutos, precio ${formatearPrecio(s.precioCentavos)}`}
                onClick={() => onSeleccionarServicio(s.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onSeleccionarServicio(s.id);
                  }
                }}
                className={`group relative p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
                  esSeleccionado
                    ? "border-zinc-900 bg-zinc-50/90 ring-2 ring-zinc-900/10 shadow-xs"
                    : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                {/* Detalles del servicio */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      esSeleccionado
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white group-hover:border-zinc-400"
                    }`}
                  >
                    {esSeleccionado && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-zinc-900 text-base">
                        {s.nombre}
                      </h4>
                      {s.categoria && (
                        <span className="text-[11px] bg-zinc-100 text-zinc-600 font-semibold px-2 py-0.5 rounded-md">
                          {s.categoria}
                        </span>
                      )}
                    </div>

                    {s.descripcion && (
                      <p className="text-xs text-zinc-500 mt-1 max-w-lg leading-relaxed">
                        {s.descripcion}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {s.duracionMin} minutos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Precio y selector */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold">
                      Precio
                    </span>
                    <span className="text-lg font-extrabold text-zinc-900 font-mono">
                      {formatearPrecio(s.precioCentavos)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Controles de navegación */}
      <div className="pt-4 border-t border-zinc-100 flex items-center justify-end">
        <ACButton
          type="button"
          variante="primario"
          disabled={!hayServicioSeleccionado}
          onClick={onContinuar}
          iconoDerecha={<ArrowRight className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Continuar a Fecha y Horario
        </ACButton>
      </div>
    </ACCard>
  );
};
