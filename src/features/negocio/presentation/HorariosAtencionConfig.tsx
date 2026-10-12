"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACBadge, ACToggle } from "@/shared/ui";
import { HorarioDiaConfig } from "../domain/entities";
import {
  DIAS_SEMANA_INFO,
  generarHorariosPorDefecto,
  validarHorarioDia,
  validarSemanaHorarios,
  calcularMinutosTrabajo,
  calcularHorasSemanalesTotales,
  contarDiasAbiertos,
  obtenerTurnosEfectivos,
  formatearResumenHorarioDia,
  formatearHora12,
  horaAMinutos,
} from "../domain/horariosAtencion";
import {
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Copy,
  Save,
  Calendar,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export interface HorariosAtencionConfigProps {
  horariosIniciales?: HorarioDiaConfig[];
  onGuardar?: (horarios: HorarioDiaConfig[]) => Promise<void>;
  cargando?: boolean;
  className?: string;
}

export const HorariosAtencionConfig: React.FC<HorariosAtencionConfigProps> = ({
  horariosIniciales,
  onGuardar,
  cargando = false,
  className = "",
}) => {
  const [horarios, setHorarios] = useState<HorarioDiaConfig[]>(() =>
    horariosIniciales && horariosIniciales.length === 7
      ? horariosIniciales
      : generarHorariosPorDefecto()
  );

  // Día actualmente seleccionado para edición (1 = Lunes por defecto)
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(1);
  const [guardadoExitoso, setGuardadoExitoso] = useState<boolean>(false);
  const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

  // Obtener el día activo actual
  const configDiaActual =
    horarios.find((h) => h.diaSemana === diaSeleccionado) || horarios[0];

  // Validación de la semana completa
  const validacionSemana = validarSemanaHorarios(horarios);
  const errorDiaActual = validarHorarioDia(configDiaActual).errores;

  // Estadísticas globales
  const { abiertos, cerrados } = contarDiasAbiertos(horarios);
  const horasTotales = calcularHorasSemanalesTotales(horarios);

  // Actualizar un día específico
  const actualizarDia = (
    diaSemana: number,
    cambios: Partial<HorarioDiaConfig>
  ) => {
    setGuardadoExitoso(false);
    setHorarios((prev) =>
      prev.map((d) => (d.diaSemana === diaSemana ? { ...d, ...cambios } : d))
    );
  };

  // Alternar estado activo (Abierto / Cerrado)
  const alternarEstadoDia = (diaSemana: number, nuevoEstado?: boolean) => {
    const dia = horarios.find((h) => h.diaSemana === diaSemana);
    if (!dia) return;
    const estado = nuevoEstado !== undefined ? nuevoEstado : !dia.activo;
    actualizarDia(diaSemana, { activo: estado });
  };

  // Copiar horario del día actual a Lunes a Viernes
  const replicarALunesViernes = () => {
    setHorarios((prev) =>
      prev.map((d) => {
        if (d.diaSemana >= 1 && d.diaSemana <= 5) {
          return {
            ...d,
            activo: configDiaActual.activo,
            apertura: configDiaActual.apertura,
            cierre: configDiaActual.cierre,
            receso: configDiaActual.receso
              ? { ...configDiaActual.receso }
              : undefined,
          };
        }
        return d;
      })
    );
    setMensajeFeedback(
      `¡Horario de ${configDiaActual.nombreDia} replicado con éxito a Lunes–Viernes!`
    );
    setTimeout(() => setMensajeFeedback(null), 3000);
  };

  // Restaurar horarios por defecto
  const restaurarPorDefecto = () => {
    setHorarios(generarHorariosPorDefecto());
    setMensajeFeedback("Horarios restablecidos a la configuración sugerida.");
    setTimeout(() => setMensajeFeedback(null), 3000);
  };

  // Guardar configuración
  const handleGuardar = async () => {
    if (!validacionSemana.valido) return;
    if (onGuardar) {
      await onGuardar(horarios);
    }
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 3500);
  };

  // Cálculo de minutos del día actual
  const minutosDia = calcularMinutosTrabajo(configDiaActual);
  const horasDia = (minutosDia / 60).toFixed(1);
  const turnosEfectivos = obtenerTurnosEfectivos(configDiaActual);

  return (
    <ACCard
      titulo="Horarios de Atención & Jornadas"
      subtitulo="Configura qué días opera tu negocio, tus horas de apertura/cierre y los descansos para el almuerzo."
      className={className}
    >
      <div className="space-y-6">
        {/* Barra de Estadísticas y Acciones Rápidas */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {abiertos} días abiertos • {cerrados} cerrados
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{horasTotales} hrs semanales de atención</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={replicarALunesViernes}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors shadow-2xs"
              title="Copiar configuración del día seleccionado a Lunes-Viernes"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
              <span>Copiar a Lun–Vie</span>
            </button>

            <button
              type="button"
              onClick={restaurarPorDefecto}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 bg-transparent hover:bg-zinc-200/60 rounded-xl transition-colors"
              title="Restaurar horario estándar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
          </div>
        </div>

        {/* Notificaciones de éxito o feedback temporal */}
        {mensajeFeedback && (
          <div className="p-3 bg-zinc-900 text-white text-xs font-medium rounded-xl flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{mensajeFeedback}</span>
          </div>
        )}

        {guardadoExitoso && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              ¡Horarios de atención guardados exitosamente en la configuración de tu negocio!
            </span>
          </div>
        )}

        {!validacionSemana.valido && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Existen inconsistencias en los horarios configurados. Por favor corrige los errores antes de guardar.
            </span>
          </div>
        )}

        {/* Selector Interactivo de Días (Lunes a Domingo) con Chips */}
        <div>
          <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5 block">
            Seleccionar Día de la Semana
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {DIAS_SEMANA_INFO.map((info) => {
              const config =
                horarios.find((h) => h.diaSemana === info.diaSemana) || {
                  diaSemana: info.diaSemana,
                  nombreDia: info.nombre,
                  activo: false,
                  apertura: "09:00",
                  cierre: "18:00",
                };
              const estaSeleccionado = diaSeleccionado === info.diaSemana;
              const tieneError = !!validacionSemana.erroresPorDia[info.diaSemana];

              return (
                <button
                  key={info.diaSemana}
                  type="button"
                  onClick={() => setDiaSeleccionado(info.diaSemana)}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative ${
                    estaSeleccionado
                      ? "border-zinc-900 ring-2 ring-zinc-900/10 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300 text-zinc-800"
                  } ${tieneError ? "ring-2 ring-rose-500/50 border-rose-400" : ""}`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span
                      className={`text-xs font-bold ${
                        estaSeleccionado ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {info.nombre}
                    </span>

                    {/* Chip de Estado Abierto / Cerrado */}
                    {config.activo ? (
                      <ACBadge
                        variante="exito"
                        className={
                          estaSeleccionado
                            ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30 text-[10px] px-1.5 py-0.5"
                            : "text-[10px] px-1.5 py-0.5"
                        }
                      >
                        Abierto
                      </ACBadge>
                    ) : (
                      <ACBadge
                        variante="neutral"
                        className={
                          estaSeleccionado
                            ? "bg-zinc-800 text-zinc-400 ring-zinc-700 text-[10px] px-1.5 py-0.5"
                            : "text-[10px] px-1.5 py-0.5"
                        }
                      >
                        Cerrado
                      </ACBadge>
                    )}
                  </div>

                  <span
                    className={`text-[11px] truncate w-full ${
                      estaSeleccionado
                        ? "text-zinc-300"
                        : config.activo
                        ? "text-zinc-500"
                        : "text-zinc-400 italic"
                    }`}
                  >
                    {config.activo
                      ? `${config.apertura} - ${config.cierre}`
                      : "Sin servicio"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Detallado de Configuración para el Día Seleccionado */}
        <div className="bg-zinc-50/70 border border-zinc-200/90 rounded-2xl p-5 space-y-5">
          {/* Encabezado del Día */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900">
                  {configDiaActual.nombreDia}
                </h3>
                {configDiaActual.activo ? (
                  <ACBadge variante="exito">Jornada Activa</ACBadge>
                ) : (
                  <ACBadge variante="neutral">Día no laboral</ACBadge>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {configDiaActual.activo
                  ? `Atención programada: ${horasDia} horas efectivas de servicio`
                  : "El negocio no recibirá citas en este día"}
              </p>
            </div>

            {/* Toggle Abierto / Cerrado */}
            <ACToggle
              activo={configDiaActual.activo}
              onChange={(nuevo) => alternarEstadoDia(diaSeleccionado, nuevo)}
              etiqueta={configDiaActual.activo ? "Abierto" : "Cerrado"}
              descripcion={
                configDiaActual.activo
                  ? "Acepta citas"
                  : "Deshabilitar este día"
              }
            />
          </div>

          {configDiaActual.activo ? (
            <div className="space-y-5">
              {/* Sección 1: Horarios de Apertura y Cierre */}
              <div>
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Horario de Atención General</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hora Apertura */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                      Hora de Apertura *
                    </label>
                    <input
                      type="time"
                      value={configDiaActual.apertura}
                      onChange={(e) =>
                        actualizarDia(diaSeleccionado, {
                          apertura: e.target.value,
                        })
                      }
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs"
                    />
                    {errorDiaActual.apertura && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errorDiaActual.apertura}</span>
                      </p>
                    )}
                  </div>

                  {/* Hora Cierre */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                      Hora de Cierre *
                    </label>
                    <input
                      type="time"
                      value={configDiaActual.cierre}
                      onChange={(e) =>
                        actualizarDia(diaSeleccionado, {
                          cierre: e.target.value,
                        })
                      }
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs"
                    />
                    {errorDiaActual.cierre && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errorDiaActual.cierre}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 2: Intervalo de Descanso (Lunch Break / Receso) */}
              <div className="bg-white border border-zinc-200/90 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">
                        Intervalo de Descanso / Receso
                      </h4>
                      <p className="text-xs text-zinc-500">
                        Pausa para comida o descanso del personal (bloquea la agenda automáticamente)
                      </p>
                    </div>
                  </div>

                  <ACToggle
                    activo={!!configDiaActual.receso?.activo}
                    onChange={(nuevo) => {
                      actualizarDia(diaSeleccionado, {
                        receso: {
                          activo: nuevo,
                          inicio: configDiaActual.receso?.inicio || "14:00",
                          fin: configDiaActual.receso?.fin || "15:00",
                        },
                      });
                    }}
                  />
                </div>

                {configDiaActual.receso?.activo && (
                  <div className="pt-3 border-t border-zinc-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Inicio Receso */}
                      <div>
                        <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                          Inicio de Descanso
                        </label>
                        <input
                          type="time"
                          value={configDiaActual.receso.inicio}
                          onChange={(e) =>
                            actualizarDia(diaSeleccionado, {
                              receso: {
                                activo: true,
                                inicio: e.target.value,
                                fin: configDiaActual.receso?.fin || "15:00",
                              },
                            })
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs"
                        />
                      </div>

                      {/* Fin Receso */}
                      <div>
                        <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                          Fin de Descanso
                        </label>
                        <input
                          type="time"
                          value={configDiaActual.receso.fin}
                          onChange={(e) =>
                            actualizarDia(diaSeleccionado, {
                              receso: {
                                activo: true,
                                inicio: configDiaActual.receso?.inicio || "14:00",
                                fin: e.target.value,
                              },
                            })
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs"
                        />
                      </div>
                    </div>

                    {errorDiaActual.receso && (
                      <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200/90 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{errorDiaActual.receso}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección 3: Representación Gráfica de la Jornada */}
              {turnosEfectivos.length > 0 && (
                <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700">
                      Visualización de Turnos Efectivos
                    </span>
                    <span className="text-zinc-500 font-medium">
                      {formatearResumenHorarioDia(configDiaActual)}
                    </span>
                  </div>

                  {/* Barra Gráfica de Turnos y Descanso */}
                  <div className="flex items-center gap-1.5 h-7 w-full bg-zinc-100 rounded-lg p-1 overflow-hidden">
                    {turnosEfectivos.map((turno, idx) => (
                      <React.Fragment key={idx}>
                        <div
                          className="bg-zinc-800 text-white rounded text-[10px] font-bold flex items-center justify-center px-2 py-0.5 grow truncate shadow-2xs"
                          title={`Turno de atención: ${turno.inicio} - ${turno.fin}`}
                        >
                          <span className="truncate">
                            {formatearHora12(turno.inicio)} – {formatearHora12(turno.fin)}
                          </span>
                        </div>

                        {idx === 0 &&
                          configDiaActual.receso?.activo &&
                          turnosEfectivos.length > 1 && (
                            <div
                              className="bg-amber-100 border border-amber-300 text-amber-800 rounded text-[10px] font-bold flex items-center justify-center px-2 py-0.5 shrink-0 gap-1"
                              title={`Descanso: ${configDiaActual.receso.inicio} - ${configDiaActual.receso.fin}`}
                            >
                              <Coffee className="w-2.5 h-2.5 text-amber-600" />
                              <span className="hidden sm:inline">Receso</span>
                            </div>
                          )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Estado del Día Cerrado */
            <div className="py-6 text-center space-y-3 bg-white rounded-xl border border-dashed border-zinc-300">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  {configDiaActual.nombreDia} está marcado como Cerrado
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  No habrá slots de disponibilidad en este día para reservas públicas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => alternarEstadoDia(diaSeleccionado, true)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
              >
                Habilitar servicio en {configDiaActual.nombreDia}
              </button>
            </div>
          )}
        </div>

        {/* Resumen Compacto Semanal */}
        <div className="border border-zinc-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Resumen Semanal Completo
            </span>
            <span className="text-xs text-zinc-500">
              {horasTotales} hrs totales
            </span>
          </div>

          <div className="divide-y divide-zinc-100">
            {horarios.map((dia) => (
              <div
                key={dia.diaSemana}
                className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors hover:bg-zinc-50/60 ${
                  diaSeleccionado === dia.diaSemana ? "bg-zinc-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-900 w-24">
                    {dia.nombreDia}
                  </span>
                  {dia.activo ? (
                    <ACBadge variante="exito" className="text-[10px] px-1.5 py-0.5">
                      Abierto
                    </ACBadge>
                  ) : (
                    <ACBadge variante="neutral" className="text-[10px] px-1.5 py-0.5">
                      Cerrado
                    </ACBadge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-zinc-600 font-medium font-mono text-[11px]">
                    {formatearResumenHorarioDia(dia)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiaSeleccionado(dia.diaSemana)}
                    className="text-zinc-400 hover:text-zinc-900 font-medium underline text-[11px]"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Guardado */}
        <div className="flex items-center justify-end pt-2">
          <ACButton
            type="button"
            onClick={handleGuardar}
            cargando={cargando}
            disabled={!validacionSemana.valido || cargando}
            iconoIzquierda={<Save className="w-4 h-4" />}
          >
            Guardar Horarios de Atención
          </ACButton>
        </div>
      </div>
    </ACCard>
  );
};
