"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACInput, ACBadge, ACToggle } from "@/shared/ui";
import {
  ServicioItem,
  HorarioLaboralItem,
  CrearServicioInput,
  GuardarHorariosInput,
} from "../domain/entities";
import {
  Layers,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  CalendarCheck2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

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
  const [precio, setPrecio] = useState(250);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);

  // Estado de horarios
  const [configHorarios, setConfigHorarios] = useState(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((dia) => {
      const hExistente = horarios.find((h) => h.diaSemana === dia);
      return {
        diaSemana: dia,
        abre: hExistente?.abre || "09:00",
        cierra: hExistente?.cierra || "19:00",
        activo: hExistente ? hExistente.activo : dia !== 0, // Domingo cerrado por defecto
      };
    });
  });

  const diasActivosCount = configHorarios.filter((h) => h.activo).length;

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
    setPrecio(250);
  };

  const handleGuardarHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardarHorarios(configHorarios);
    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Servicios y Horarios
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configura las opciones que tus clientes podrán reservar y tus horas disponibles
          </p>
        </div>

        {/* Selector de pestañas moderno tipo pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setTab("servicios")}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-150 flex items-center gap-2 ${
              tab === "servicios"
                ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Servicios</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                tab === "servicios"
                  ? "bg-zinc-100 text-zinc-800 font-bold"
                  : "bg-zinc-300/60 text-zinc-600"
              }`}
            >
              {servicios.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("horarios")}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-150 flex items-center gap-2 ${
              tab === "horarios"
                ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Horarios Semanales</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                tab === "horarios"
                  ? "bg-zinc-100 text-zinc-800 font-bold"
                  : "bg-zinc-300/60 text-zinc-600"
              }`}
            >
              {diasActivosCount} días
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200/90 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tab === "servicios" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulario nuevo servicio (4 cols) */}
          <div className="lg:col-span-5">
            <ACCard
              titulo="Nuevo Servicio"
              subtitulo="Agrega una opción reservable para tus clientes"
            >
              <form onSubmit={handleCrearServicio} className="space-y-4">
                <ACInput
                  etiqueta="Nombre del servicio *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Ej. Corte Tradicional & Barba"
                />

                <div className="grid grid-cols-2 gap-3">
                  <ACInput
                    etiqueta="Duración (Min) *"
                    type="number"
                    value={duracionMin}
                    onChange={(e) => setDuracionMin(Number(e.target.value))}
                    required
                    min={10}
                    step={5}
                    iconoIzquierda={<Clock className="w-4 h-4 text-zinc-400" />}
                  />

                  <ACInput
                    etiqueta="Precio ($ MXN) *"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(Number(e.target.value))}
                    required
                    min={0}
                    iconoIzquierda={<DollarSign className="w-4 h-4 text-zinc-400" />}
                  />
                </div>

                <ACInput
                  etiqueta="Descripción (Opcional)"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles del procedimiento o qué incluye..."
                />

                <div className="pt-2">
                  <ACButton
                    type="submit"
                    cargando={cargando}
                    iconoIzquierda={<Plus className="w-4 h-4" />}
                    className="w-full"
                  >
                    Crear Servicio
                  </ACButton>
                </div>
              </form>
            </ACCard>
          </div>

          {/* Listado de servicios (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h3 className="text-sm font-bold text-zinc-900">
                  Catálogo Actual ({servicios.length})
                </h3>
                <span className="text-xs text-zinc-400">
                  Disponibles en tu página pública
                </span>
              </div>

              {servicios.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-2">
                    <Layers className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Aún no tienes servicios registrados. Utiliza el formulario de la izquierda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {servicios.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 text-base tracking-tight">
                            {s.nombre}
                          </span>
                          {s.activo ? (
                            <ACBadge variante="exito">Activo</ACBadge>
                          ) : (
                            <ACBadge variante="neutral">Inactivo</ACBadge>
                          )}
                        </div>

                        {s.descripcion && (
                          <p className="text-xs text-zinc-500 line-clamp-1">
                            {s.descripcion}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs pt-0.5">
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {s.duracionMin} min
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60">
                            ${(s.precioCentavos / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <ACButton
                          type="button"
                          variante={s.activo ? "secundario" : "primario"}
                          onClick={() => onAlternarEstadoServicio(s.id, !s.activo)}
                          className="text-xs min-h-[34px] py-1 px-3"
                        >
                          {s.activo ? "Desactivar" : "Activar"}
                        </ACButton>
                        <ACButton
                          type="button"
                          variante="fantasma"
                          onClick={() => onEliminarServicio(s.id)}
                          className="text-xs min-h-[34px] py-1 px-2.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Eliminar Servicio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </ACButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Pestaña: Horarios Semanales */
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Horarios Semanales de Atención
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Los turnos en tu página pública se generarán automáticamente en este rango
                </p>
              </div>

              {mensajeGuardado && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Cambios guardados!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleGuardarHorarios} className="p-6">
              <div className="divide-y divide-zinc-100">
                {configHorarios.map((h, idx) => (
                  <div
                    key={h.diaSemana}
                    className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4 min-w-[180px]">
                      <ACToggle
                        activo={h.activo}
                        onChange={(nuevoActivo) => {
                          const copia = [...configHorarios];
                          copia[idx].activo = nuevoActivo;
                          setConfigHorarios(copia);
                        }}
                      />
                      <div>
                        <span
                          className={`text-sm font-bold block ${
                            h.activo ? "text-zinc-900" : "text-zinc-400"
                          }`}
                        >
                          {DIAS_SEMANA[h.diaSemana]}
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          {h.activo ? "Abierto para reservas" : "Día no laborable"}
                        </span>
                      </div>
                    </div>

                    {h.activo ? (
                      <div className="flex items-center gap-2.5 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200/70">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">
                            De
                          </span>
                          <input
                            type="time"
                            value={h.abre}
                            onChange={(e) => {
                              const copia = [...configHorarios];
                              copia[idx].abre = e.target.value;
                              setConfigHorarios(copia);
                            }}
                            className="bg-white border border-zinc-200 text-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                        <span className="text-zinc-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            A
                          </span>
                          <input
                            type="time"
                            value={h.cierra}
                            onChange={(e) => {
                              const copia = [...configHorarios];
                              copia[idx].cierra = e.target.value;
                              setConfigHorarios(copia);
                            }}
                            className="bg-white border border-zinc-200 text-zinc-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-3 py-1 rounded-lg">
                        Cerrado
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-5 border-t border-zinc-100 flex justify-end">
                <ACButton
                  type="submit"
                  cargando={cargando}
                  iconoIzquierda={<Save className="w-4 h-4" />}
                >
                  Guardar Horarios
                </ACButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
