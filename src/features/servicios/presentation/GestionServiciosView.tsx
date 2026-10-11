"use client";

import React, { useState, useMemo } from "react";
import { ACCard, ACButton, ACInput, ACBadge, ACToggle } from "@/shared/ui";
import {
  ServicioItem,
  HorarioLaboralItem,
  CrearServicioInput,
  ActualizarServicioInput,
  GuardarHorariosInput,
} from "../domain/entities";
import {
  validarServicioPayload,
  obtenerCategoriasDisponibles,
  filtrarServicios,
  calcularResumenCatalogo,
  formatearPrecioPesos,
} from "../domain/catalogoServicios";
import { ServicioModal, DatosServicioModal } from "./ServicioModal";
import {
  Layers,
  Clock,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  CalendarCheck2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Tag,
  SlidersHorizontal,
  Check,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

export interface GestionServiciosViewProps {
  servicios: ServicioItem[];
  horarios: HorarioLaboralItem[];
  onCrearServicio: (input: Omit<CrearServicioInput, "negocioId">) => Promise<void>;
  onActualizarServicio?: (input: ActualizarServicioInput) => Promise<void>;
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
  onActualizarServicio,
  onAlternarEstadoServicio,
  onEliminarServicio,
  onGuardarHorarios,
  cargando = false,
  error,
}) => {
  const [tab, setTab] = useState<"servicios" | "horarios">("servicios");

  // Estado del modal de servicio
  const [modalAbierto, setModalAbierto] = useState(false);
  const [servicioAEditar, setServicioAEditar] = useState<ServicioItem | null>(null);

  // Filtros de visualización en catálogo
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>("");

  // Mensaje de éxito de horarios
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

  // Métricas y filtrado computados
  const metricas = useMemo(() => calcularResumenCatalogo(servicios), [servicios]);
  const categoriasDisponibles = useMemo(
    () => obtenerCategoriasDisponibles(servicios),
    [servicios]
  );
  const serviciosFiltrados = useMemo(
    () =>
      filtrarServicios(servicios, {
        categoria: filtroCategoria,
        busqueda: terminoBusqueda,
      }),
    [servicios, filtroCategoria, terminoBusqueda]
  );

  const abrirModalCrear = () => {
    setServicioAEditar(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (servicio: ServicioItem) => {
    setServicioAEditar(servicio);
    setModalAbierto(true);
  };

  const handleGuardarModal = async (datos: DatosServicioModal) => {
    if (datos.id && onActualizarServicio) {
      await onActualizarServicio({
        id: datos.id,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        duracionMin: datos.duracionMin,
        precioCentavos: datos.precioCentavos,
        categoria: datos.categoria,
      });
    } else {
      await onCrearServicio({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        duracionMin: datos.duracionMin,
        precioCentavos: datos.precioCentavos,
        categoria: datos.categoria,
      });
    }
  };

  const handleGuardarHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardarHorarios(configHorarios);
    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y pestañas principales */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Catálogo y Gestión de Servicios
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configura las opciones que tus clientes podrán reservar y tus horas de atención
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === "servicios" && (
            <ACButton
              type="button"
              onClick={abrirModalCrear}
              iconoIzquierda={<Plus className="w-4 h-4" />}
              className="text-xs"
            >
              Nuevo Servicio
            </ACButton>
          )}

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
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200/90 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tab === "servicios" ? (
        <div className="space-y-6">
          {/* Tarjetas resumen de métricas del catálogo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Total Servicios
              </span>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{metricas.totalServicios}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Opciones registradas</p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                Activos
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-emerald-700">{metricas.activos}</span>
                <ACBadge variante="exito" className="text-[10px] py-0 px-1.5">
                  Reservables
                </ACBadge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Visibles al público</p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                Pausados
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-amber-700">{metricas.pausados}</span>
                <ACBadge variante="advertencia" className="text-[10px] py-0 px-1.5">
                  En pausa
                </ACBadge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Desactivados temporalmente</p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Promedio
              </span>
              <p className="text-2xl font-bold text-zinc-900 mt-1">
                {metricas.duracionPromedioMin} min
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatearPrecioPesos(metricas.precioPromedioCentavos)} promedio
              </p>
            </div>
          </div>

          {/* Barra de filtros y categorías */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            {/* Categorías como filtros tipo pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-zinc-400 mr-1 hidden sm:inline flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Categorías:
              </span>
              <button
                type="button"
                onClick={() => setFiltroCategoria("todas")}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                  filtroCategoria === "todas"
                    ? "bg-zinc-900 text-white font-semibold"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
                }`}
              >
                Todas ({servicios.length})
              </button>
              {categoriasDisponibles.map((cat) => {
                const count = servicios.filter((s) => s.categoria === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFiltroCategoria(cat)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                      filtroCategoria === cat
                        ? "bg-zinc-900 text-white font-semibold"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Buscador de servicios */}
            <div className="w-full md:w-64">
              <ACInput
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar servicio..."
                iconoIzquierda={<Search className="w-4 h-4 text-zinc-400" />}
                className="w-full"
              />
            </div>
          </div>

          {/* Listado de servicios */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">
                  Catálogo de Servicios ({serviciosFiltrados.length})
                </h3>
                {filtroCategoria !== "todas" && (
                  <ACBadge variante="primario" className="text-[10px]">
                    {filtroCategoria}
                  </ACBadge>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                Disponibles en tu página pública de reservas
              </span>
            </div>

            {serviciosFiltrados.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-800">No se encontraron servicios</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  {terminoBusqueda || filtroCategoria !== "todas"
                    ? "No hay servicios que coincidan con los filtros aplicados. Intenta restablecer los filtros."
                    : "Aún no tienes servicios configurados. Agrega el primero para comenzar a recibir citas."}
                </p>
                <ACButton
                  type="button"
                  onClick={abrirModalCrear}
                  iconoIzquierda={<Plus className="w-4 h-4" />}
                  className="text-xs"
                >
                  Crear Servicio
                </ACButton>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {serviciosFiltrados.map((s) => (
                  <div
                    key={s.id}
                    className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/50 transition-colors"
                  >
                    {/* Información del servicio */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-900 text-base tracking-tight truncate">
                          {s.nombre}
                        </span>
                        {s.categoria && (
                          <ACBadge variante="primario" className="text-[11px] py-0.5 px-2">
                            {s.categoria}
                          </ACBadge>
                        )}
                        {/* Badge visual activo vs pausado */}
                        {s.activo ? (
                          <ACBadge variante="exito">Activo</ACBadge>
                        ) : (
                          <ACBadge variante="advertencia">Pausado</ACBadge>
                        )}
                      </div>

                      {s.descripcion && (
                        <p className="text-xs text-zinc-500 line-clamp-2 max-w-xl">
                          {s.descripcion}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs pt-0.5">
                        <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {s.duracionMin} min
                        </span>
                        <span className="text-zinc-300">•</span>
                        <span className="font-bold text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200/70">
                          {formatearPrecioPesos(s.precioCentavos)} MXN
                        </span>
                        <span className="text-zinc-300 hidden sm:inline">•</span>
                        <span className="text-[11px] text-zinc-400 hidden sm:inline">
                          ({s.precioCentavos.toLocaleString("es-MX")} centavos)
                        </span>
                      </div>
                    </div>

                    {/* Acciones y Toggle activo/pausado */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {/* Toggle interactivo de estado con etiqueta visual */}
                      <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200/70">
                        <ACToggle
                          activo={s.activo}
                          onChange={(nuevoEstado) => onAlternarEstadoServicio(s.id, nuevoEstado)}
                          deshabilitado={cargando}
                        />
                        <span
                          className={`text-xs font-semibold select-none ${
                            s.activo ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {s.activo ? "Activo" : "Pausado"}
                        </span>
                      </div>

                      {/* Botón Editar modal */}
                      <ACButton
                        type="button"
                        variante="secundario"
                        onClick={() => abrirModalEditar(s)}
                        className="text-xs min-h-[34px] py-1 px-3 flex items-center gap-1.5"
                        title="Editar Servicio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Editar</span>
                      </ACButton>

                      {/* Botón Eliminar */}
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

          {/* Modal interactivo de creación / edición */}
          <ServicioModal
            abierto={modalAbierto}
            servicioParaEditar={servicioAEditar}
            onCerrar={() => setModalAbierto(false)}
            onGuardar={handleGuardarModal}
            cargando={cargando}
          />
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
