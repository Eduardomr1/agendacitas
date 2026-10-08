"use client";

import React, { useState } from "react";
import { ACCard, ACButton } from "@/shared/ui";
import { CitaAdminItem, EstadoCita } from "../domain/entities";

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

  const citasFiltradas = citas.filter((c) => {
    if (filtroEstado === "todas") return true;
    return c.estado === filtroEstado;
  });

  const formatearFecha = (d: Date) => {
    return new Date(d).toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatearHora = (d: Date) => {
    return new Date(d).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto my-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Citas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitorea y gestiona las reservaciones de tu negocio
          </p>
        </div>

        {/* Filtro rápido */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 text-xs">
          {["todas", "confirmada", "completada", "cancelada"].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`px-3 py-1.5 rounded-md capitalize font-medium transition-colors ${
                filtroEstado === st
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <ACCard>
        {citasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 italic">No hay citas registradas para este filtro.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {citasFiltradas.map((c) => (
              <div
                key={c.id}
                className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* Bloque de Horario */}
                  <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-lg p-2.5 text-center min-w-[90px]">
                    <span className="block text-xs uppercase font-bold text-blue-600">
                      {formatearFecha(c.inicio)}
                    </span>
                    <span className="block text-base font-extrabold mt-0.5">
                      {formatearHora(c.inicio)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-base">
                        {c.clienteNombre}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.estado === "confirmada"
                            ? "bg-green-100 text-green-800"
                            : c.estado === "completada"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.estado.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mt-1 font-medium">
                      {c.servicioNombre} ({c.duracionMin} min) •{" "}
                      <span className="text-blue-600 font-bold">
                        ${(c.precioCentavos / 100).toFixed(2)}
                      </span>
                    </p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{c.clienteEmail}</span>
                      {c.clienteTelefono && (
                        <>
                          <span>•</span>
                          <span>{c.clienteTelefono}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {c.estado === "confirmada" && (
                    <>
                      <ACButton
                        type="button"
                        variante="contorno"
                        onClick={() => onCambiarEstado(c.id, "completada")}
                        className="text-xs min-h-[36px] py-1 px-3"
                      >
                        ✓ Completar
                      </ACButton>
                      <ACButton
                        type="button"
                        variante="peligro"
                        onClick={() => onCambiarEstado(c.id, "cancelada")}
                        className="text-xs min-h-[36px] py-1 px-3"
                      >
                        Cancelar
                      </ACButton>
                    </>
                  )}
                  {c.estado === "cancelada" && (
                    <ACButton
                      type="button"
                      variante="contorno"
                      onClick={() => onCambiarEstado(c.id, "confirmada")}
                      className="text-xs min-h-[36px] py-1 px-3"
                    >
                      Reactivar
                    </ACButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ACCard>
    </div>
  );
};
