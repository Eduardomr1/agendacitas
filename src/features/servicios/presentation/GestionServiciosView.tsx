"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACInput } from "@/shared/ui";
import {
  ServicioItem,
  HorarioLaboralItem,
  CrearServicioInput,
  GuardarHorariosInput,
} from "../domain/entities";

interface GestionServiciosViewProps {
  servicios: ServicioItem[];
  horarios: HorarioLaboralItem[];
  onCrearServicio: (input: Omit<CrearServicioInput, "negocioId">) => Promise<void>;
  onAlternarEstadoServicio: (id: string, activo: boolean) => Promise<void>;
  onEliminarServicio: (id: string) => Promise<void>;
  onGuardarHorarios: (horarios: GuardarHorariosInput["horarios"]) => Promise<void>;
  cargando?: boolean;
  error?: string;
}

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const GestionServiciosView: React.FC<GestionServiciosViewProps> = ({
  servicios,
  horarios,
  onCrearServicio,
  onAlternarEstadoServicio,
  onEliminarServicio,
  onGuardarHorarios,
  cargando = false,
  error,
}) => {
  const [tab, setTab] = useState<"servicios" | "horarios">("servicios");

  // Formulario nuevo servicio
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracionMin, setDuracionMin] = useState(30);
  const [precio, setPrecio] = useState(150);

  // Estado de horarios
  const [configHorarios, setConfigHorarios] = useState(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((dia) => {
      const hExistente = horarios.find((h) => h.diaSemana === dia);
      return {
        diaSemana: dia,
        abre: hExistente?.abre || "09:00",
        cierra: hExistente?.cierra || "18:00",
        activo: hExistente ? hExistente.activo : dia !== 0, // Domingo inactivo por defecto
      };
    });
  });

  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCrearServicio({
      nombre,
      descripcion: descripcion || undefined,
      duracionMin: Number(duracionMin),
      precioCentavos: Math.round(Number(precio) * 100),
    });
    setNombre("");
    setDescripcion("");
  };

  const handleGuardarHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardarHorarios(configHorarios);
  };

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      {/* Navegación por tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab("servicios")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            tab === "servicios"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Servicios Ofrecidos
        </button>
        <button
          onClick={() => setTab("horarios")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            tab === "horarios"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Horarios de Atención
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {tab === "servicios" ? (
        <div className="flex flex-col gap-8">
          {/* Formulario para agregar servicio */}
          <ACCard titulo="Nuevo Servicio" subtitulo="Agrega un servicio al catálogo">
            <form onSubmit={handleCrearServicio} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ACInput
                  etiqueta="Nombre del Servicio *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Ej. Corte Degradado"
                />
                <div className="grid grid-cols-2 gap-2">
                  <ACInput
                    etiqueta="Duración (Min) *"
                    type="number"
                    value={duracionMin}
                    onChange={(e) => setDuracionMin(Number(e.target.value))}
                    required
                    min={15}
                    step={15}
                  />
                  <ACInput
                    etiqueta="Precio ($) *"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(Number(e.target.value))}
                    required
                    min={0}
                  />
                </div>
              </div>

              <ACInput
                etiqueta="Descripción (Opcional)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalle o productos incluidos..."
              />

              <div className="flex justify-end">
                <ACButton type="submit" cargando={cargando}>
                  + Agregar Servicio
                </ACButton>
              </div>
            </form>
          </ACCard>

          {/* Listado de servicios actuales */}
          <ACCard titulo="Servicios Registrados">
            {servicios.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                Aún no has registrado ningún servicio.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {servicios.map((s) => (
                  <div
                    key={s.id}
                    className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {s.nombre}
                        </span>
                        {!s.activo && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.duracionMin} min • ${(s.precioCentavos / 100).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <ACButton
                        type="button"
                        variante="contorno"
                        onClick={() => onAlternarEstadoServicio(s.id, !s.activo)}
                        className="text-xs min-h-[36px] py-1 px-3"
                      >
                        {s.activo ? "Desactivar" : "Activar"}
                      </ACButton>
                      <ACButton
                        type="button"
                        variante="peligro"
                        onClick={() => onEliminarServicio(s.id)}
                        className="text-xs min-h-[36px] py-1 px-3"
                      >
                        Eliminar
                      </ACButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ACCard>
        </div>
      ) : (
        /* Configuración de horarios semanales */
        <ACCard
          titulo="Horarios de Atención Semanales"
          subtitulo="Establece a qué hora abre y cierra tu negocio cada día"
        >
          <form onSubmit={handleGuardarHorarios} className="flex flex-col gap-4">
            <div className="divide-y divide-gray-100">
              {configHorarios.map((h, idx) => (
                <div
                  key={h.diaSemana}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <label className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={h.activo}
                      onChange={(e) => {
                        const copia = [...configHorarios];
                        copia[idx].activo = e.target.checked;
                        setConfigHorarios(copia);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span
                      className={`text-sm font-medium ${
                        h.activo ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {DIAS_SEMANA[h.diaSemana]}
                    </span>
                  </label>

                  {h.activo ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={h.abre}
                        onChange={(e) => {
                          const copia = [...configHorarios];
                          copia[idx].abre = e.target.value;
                          setConfigHorarios(copia);
                        }}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <span className="text-gray-400 text-xs">a</span>
                      <input
                        type="time"
                        value={h.cierra}
                        onChange={(e) => {
                          const copia = [...configHorarios];
                          copia[idx].cierra = e.target.value;
                          setConfigHorarios(copia);
                        }}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Cerrado</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <ACButton type="submit" cargando={cargando}>
                Guardar Horarios
              </ACButton>
            </div>
          </form>
        </ACCard>
      )}
    </div>
  );
};
