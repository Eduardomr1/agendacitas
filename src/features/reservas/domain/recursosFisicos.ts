/**
 * Motor Puro de Contención y Asignación de Recursos Físicos (Cabinas, Salas,
 * Equipos Compartidos y Sillas).
 *
 * Previene dobles reservas sobre infraestructura física limitada cuando múltiples
 * especialistas están disponibles simultáneamente, reutilizando la matemática
 * temporal de intervalos y buffers de `motorDisponibilidad.ts`.
 */

import {
  calcularSlotsDisponibles,
  evaluarDisponibilidadSlotEspecifico,
  horaAMinutos,
  minutosAHora,
  type BufferPreparacionConfig,
  type CitaOcupada,
  type HorarioAtencionDia,
  type IntervaloBloqueo,
  type MotivoEstadoSlot,
} from "./motorDisponibilidad";

export type TipoRecursoFisico =
  | "CABINA"
  | "SALA_MASAJE"
  | "EQUIPO_LASER"
  | "SILLA_COMPARTIDA"
  | "CONSULTORIO"
  | "OTRO";

export type EstrategiaAsignacionRecurso = "MENOR_CARGA" | "PREFERENCIA_RECURSO";

export type CodigoDiagnosticoRecursoFisico =
  | "RECURSO_ASIGNADO"
  | "SIN_RECURSO_COMPATIBLE"
  | "SIN_RECURSO_FISICO_DISPONIBLE";

export type MotivoContencionRecurso =
  | "DISPONIBLE"
  | "RECURSO_INACTIVO"
  | "SERVICIO_NO_COMPATIBLE"
  | "DIA_CERRADO"
  | "FUERA_DE_HORARIO_RECURSO"
  | "EN_MANTENIMIENTO"
  | "CAPACIDAD_SIMULTANEA_AGOTADA"
  | "CUPO_DIARIO_AGOTADO"
  | "COLISION_CITA_O_BUFFER";

export interface ReservaRecursoFisico {
  readonly id?: string;
  readonly citaId?: string;
  readonly fecha?: string; // "YYYY-MM-DD"
  readonly inicio: string | Date; // "HH:MM", ISO Date string o Date
  readonly fin: string | Date;
  readonly estado?: string;
  readonly especialistaId?: string;
  readonly servicioId?: string;
  readonly bufferAntesMin?: number;
  readonly bufferDespuesMin?: number;
}

export interface BloqueoMantenimientoRecurso {
  readonly fecha?: string; // Si se omite, aplica como bloqueo diario recurrente
  readonly inicio: string; // "HH:MM"
  readonly fin: string; // "HH:MM"
  readonly motivo?: string;
}

export interface RecursoFisico {
  readonly id: string;
  readonly negocioId?: string;
  readonly nombre: string;
  readonly tipo: TipoRecursoFisico;
  readonly activo: boolean;
  readonly serviciosCompatiblesIds: readonly string[];
  readonly capacidadSimultanea?: number; // Default: 1
  readonly bufferLimpiezaMin?: number | BufferPreparacionConfig;
  readonly horarioPorDia?: Record<number, HorarioAtencionDia>;
  readonly bloqueosMantenimiento?: readonly BloqueoMantenimientoRecurso[];
  readonly reservasAsignadas?: readonly ReservaRecursoFisico[];
  readonly maxUsosDiarios?: number;
  readonly prioridadPreferencia?: number;
}

export interface SolicitudAsignacionRecursoFisico {
  readonly negocioId?: string;
  readonly servicioId: string;
  readonly fecha: string; // "YYYY-MM-DD"
  readonly horaInicio: string; // "HH:MM"
  readonly duracionMin: number;
  readonly tipoRecursoRequerido?: TipoRecursoFisico;
  readonly recursoPreferidoId?: string;
  readonly estrategia?: EstrategiaAsignacionRecurso;
  readonly bufferAntesMin?: number;
  readonly bufferDespuesMin?: number;
  readonly bufferIncluidoEnJornada?: boolean;
  readonly excluirCitaId?: string;
  readonly excluirRecursoIds?: readonly string[];
}

export interface CitaEnConflictoRecurso {
  readonly citaId?: string;
  readonly especialistaId?: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly inicioEfectivoConBuffer: string;
  readonly finEfectivoConBuffer: string;
}

export interface DiagnosticoContencionRecurso {
  readonly recursoId: string;
  readonly recursoNombre: string;
  readonly tipo: TipoRecursoFisico;
  readonly disponible: boolean;
  readonly motivo: MotivoContencionRecurso;
  readonly detalle: string;
  readonly cargaActualDia: number;
  readonly minutosOcupadosDia: number;
  readonly concurrenciaPicoEnSlot: number;
  readonly capacidadSimultanea: number;
  readonly citasEnConflicto: readonly CitaEnConflictoRecurso[];
}

export interface AlternativaRecursoDisponible {
  readonly recursoId: string;
  readonly recursoNombre: string;
  readonly tipo: TipoRecursoFisico;
  readonly cargaActualDia: number;
  readonly minutosOcupadosDia: number;
}

export interface ResultadoAsignacionRecursoFisico {
  readonly asignado: boolean;
  readonly codigoDiagnostico: CodigoDiagnosticoRecursoFisico;
  readonly recursoId: string | null;
  readonly recursoNombre: string | null;
  readonly tipoRecurso: TipoRecursoFisico | null;
  readonly estrategiaAplicada: EstrategiaAsignacionRecurso;
  readonly recursosCompatiblesCount: number;
  readonly recursosDisponiblesCount: number;
  readonly cargaRecursoAsignado: number | null;
  readonly motivoRechazo?: string;
  readonly conflictosDetectados: readonly DiagnosticoContencionRecurso[];
  readonly alternativasDisponibles: readonly AlternativaRecursoDisponible[];
}

export interface RequisitoRecursoMultiple {
  readonly etiqueta?: string;
  readonly tipoRecursoRequerido?: TipoRecursoFisico;
  readonly recursoPreferidoId?: string;
  readonly bufferAntesMin?: number;
  readonly bufferDespuesMin?: number;
}

export interface SolicitudAsignacionMultipleRecursos {
  readonly negocioId?: string;
  readonly servicioId: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly duracionMin: number;
  readonly requisitos: readonly RequisitoRecursoMultiple[];
  readonly estrategia?: EstrategiaAsignacionRecurso;
  readonly bufferIncluidoEnJornada?: boolean;
  readonly excluirCitaId?: string;
}

export interface ResultadoAsignacionMultipleRecursos {
  readonly asignado: boolean;
  readonly codigoDiagnostico: CodigoDiagnosticoRecursoFisico;
  readonly asignaciones: readonly ResultadoAsignacionRecursoFisico[];
  readonly recursosAsignadosIds: readonly string[];
  readonly motivoRechazo?: string;
  readonly conflictosDetectados: readonly DiagnosticoContencionRecurso[];
}

export interface CalcularSlotsConRecursoParams {
  readonly negocioId?: string;
  readonly servicioId: string;
  readonly fecha: string;
  readonly horarioAtencion: HorarioAtencionDia | null;
  readonly duracionServicioMin: number;
  readonly recursos: readonly RecursoFisico[];
  readonly tipoRecursoRequerido?: TipoRecursoFisico;
  readonly pasoMin?: number;
  readonly bufferAntesMin?: number;
  readonly bufferDespuesMin?: number;
  readonly bufferIncluidoEnJornada?: boolean;
  readonly excluirCitaId?: string;
}

interface ReservaNormalizada {
  readonly citaId?: string;
  readonly especialistaId?: string;
  readonly inicioMin: number;
  readonly finMin: number;
  readonly bufAntes: number;
  readonly bufDespues: number;
  readonly efectivoInicioMin: number;
  readonly efectivoFinMin: number;
}

const HORARIO_CONTINUO_24H: HorarioAtencionDia = {
  abre: "00:00",
  cierra: "24:00",
  activo: true,
};

/**
 * Evalúa si dos intervalos semiabiertos [inicioAMin, finAMin) y
 * [inicioBMin, finBMin) se solapan en al menos un minuto.
 */
export function intervalosConBufferSeSolapan(
  inicioAMin: number,
  finAMin: number,
  inicioBMin: number,
  finBMin: number
): boolean {
  return Math.max(inicioAMin, inicioBMin) < Math.min(finAMin, finBMin);
}

function extraerMinutosDeTiempo(valor: string | Date): number {
  if (typeof valor === "string" && valor.includes("T")) {
    const limpio = valor.trim();
    const tieneZonaHoraria = /([zZ]|[+-]\d{2}:?\d{2})$/.test(limpio);
    if (!tieneZonaHoraria) {
      const parteHora = limpio.split("T")[1]?.slice(0, 5) ?? "00:00";
      return horaAMinutos(parteHora);
    }
  }
  return horaAMinutos(valor);
}

function reservaPerteneceAFecha(
  reserva: ReservaRecursoFisico,
  fecha: string
): boolean {
  if (reserva.fecha) {
    return reserva.fecha.trim() === fecha;
  }
  if (typeof reserva.inicio === "string") {
    const limpio = reserva.inicio.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(limpio)) {
      return limpio.slice(0, 10) === fecha;
    }
    return true;
  }
  if (reserva.inicio instanceof Date && Number.isFinite(reserva.inicio.getTime())) {
    return reserva.inicio.toISOString().slice(0, 10) === fecha;
  }
  return true;
}

function resolverBuffersRecurso(
  config: number | BufferPreparacionConfig | undefined
): { antes: number; despues: number } {
  if (typeof config === "number") {
    return { antes: 0, despues: Math.max(0, config) };
  }
  if (typeof config === "object" && config !== null) {
    return {
      antes: Math.max(0, config.antesMin ?? 0),
      despues: Math.max(0, config.despuesMin ?? 0),
    };
  }
  return { antes: 0, despues: 0 };
}

function obtenerDiaSemanaUTC(fecha: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio ?? 2026, (mes ?? 1) - 1, dia ?? 1, 12, 0, 0)).getUTCDay();
}

function normalizarReservasDelDia(
  recurso: RecursoFisico,
  fecha: string,
  excluirCitaId?: string
): ReservaNormalizada[] {
  const buffersRecurso = resolverBuffersRecurso(recurso.bufferLimpiezaMin);
  const resultado: ReservaNormalizada[] = [];

  for (const r of recurso.reservasAsignadas ?? []) {
    const estado = r.estado ? r.estado.toLowerCase().trim() : "confirmada";
    if (estado === "cancelada" || estado === "cancelado") {
      continue;
    }

    const idReserva = r.citaId ?? r.id;
    if (
      excluirCitaId &&
      ((r.citaId && r.citaId === excluirCitaId) || (r.id && r.id === excluirCitaId))
    ) {
      continue;
    }

    if (!reservaPerteneceAFecha(r, fecha)) {
      continue;
    }

    const inicioMin = extraerMinutosDeTiempo(r.inicio);
    const finMin = extraerMinutosDeTiempo(r.fin);
    if (finMin <= inicioMin) {
      continue;
    }

    const bufAntes =
      r.bufferAntesMin !== undefined
        ? Math.max(0, r.bufferAntesMin)
        : buffersRecurso.antes;
    const bufDespues =
      r.bufferDespuesMin !== undefined
        ? Math.max(0, r.bufferDespuesMin)
        : buffersRecurso.despues;

    resultado.push({
      citaId: idReserva,
      especialistaId: r.especialistaId,
      inicioMin,
      finMin,
      bufAntes,
      bufDespues,
      efectivoInicioMin: inicioMin - bufAntes,
      efectivoFinMin: finMin + bufDespues,
    });
  }

  return resultado;
}

function obtenerBloqueosMantenimientoDelDia(
  recurso: RecursoFisico,
  fecha: string
): IntervaloBloqueo[] {
  return (recurso.bloqueosMantenimiento ?? [])
    .filter((b) => !b.fecha || b.fecha.trim() === fecha)
    .map((b) => ({
      inicio: b.inicio,
      fin: b.fin,
      motivo: b.motivo,
    }));
}

function calcularPicoConcurrenciaEnRango(
  reservasSolapadas: readonly ReservaNormalizada[],
  rangoInicioMin: number,
  rangoFinMin: number
): number {
  if (reservasSolapadas.length === 0) {
    return 0;
  }

  const eventos: Array<{ tiempo: number; delta: number }> = [];
  for (const r of reservasSolapadas) {
    const inicioClamped = Math.max(rangoInicioMin, r.efectivoInicioMin);
    const finClamped = Math.min(rangoFinMin, r.efectivoFinMin);
    if (finClamped > inicioClamped) {
      eventos.push({ tiempo: inicioClamped, delta: 1 });
      eventos.push({ tiempo: finClamped, delta: -1 });
    }
  }

  // Procesar cierres (-1) antes que aperturas (+1) en el mismo minuto
  eventos.sort((a, b) =>
    a.tiempo !== b.tiempo ? a.tiempo - b.tiempo : a.delta - b.delta
  );

  let activa = 0;
  let pico = 0;
  for (const ev of eventos) {
    activa += ev.delta;
    if (activa > pico) {
      pico = activa;
    }
  }
  return pico;
}

function mapearMotivoSlotAContencion(
  motivo: MotivoEstadoSlot,
  capacidad: number
): MotivoContencionRecurso {
  switch (motivo) {
    case "DIA_CERRADO":
    case "FERIADO_BLOQUEADO":
      return "DIA_CERRADO";
    case "FUERA_DE_JORNADA":
      return "FUERA_DE_HORARIO_RECURSO";
    case "BLOQUEO_PARCIAL":
    case "EN_DESCANSO":
      return "EN_MANTENIMIENTO";
    case "CUPO_DIARIO_AGOTADO":
      return "CUPO_DIARIO_AGOTADO";
    case "COLISION_CITA_O_BUFFER":
      return capacidad > 1
        ? "CAPACIDAD_SIMULTANEA_AGOTADA"
        : "COLISION_CITA_O_BUFFER";
    default:
      return "COLISION_CITA_O_BUFFER";
  }
}

export class MotorRecursosFisicos {
  /**
   * Filtra los recursos físicos activos y compatibles con el servicio,
   * negocio y tipo de recurso solicitados.
   */
  public static filtrarCompatibles(
    servicioId: string,
    recursos: readonly RecursoFisico[],
    opciones?: {
      negocioId?: string;
      tipoRecursoRequerido?: TipoRecursoFisico;
      excluirRecursoIds?: readonly string[];
    }
  ): RecursoFisico[] {
    const servicioLimpio = servicioId.trim();
    const excluidos = new Set(opciones?.excluirRecursoIds ?? []);

    return recursos.filter((recurso) => {
      if (!recurso.activo) return false;
      if (excluidos.has(recurso.id)) return false;
      if (
        opciones?.negocioId &&
        recurso.negocioId &&
        recurso.negocioId.trim() !== opciones.negocioId.trim()
      ) {
        return false;
      }
      if (
        opciones?.tipoRecursoRequerido &&
        recurso.tipo !== opciones.tipoRecursoRequerido
      ) {
        return false;
      }
      return recurso.serviciosCompatiblesIds.some(
        (id) => id.trim() === servicioLimpio
      );
    });
  }

  /**
   * Evalúa la disponibilidad puntual y la carga de un recurso físico en un
   * horario dado, reutilizando la aritmética de slots y buffers de
   * `motorDisponibilidad.ts` y soportando capacidad simultánea múltiple.
   */
  public static verificarDisponibilidadRecurso(
    recurso: RecursoFisico,
    solicitud: SolicitudAsignacionRecursoFisico
  ): DiagnosticoContencionRecurso {
    const capacidadSimultanea = Math.max(1, recurso.capacidadSimultanea ?? 1);
    const reservasDia = normalizarReservasDelDia(
      recurso,
      solicitud.fecha,
      solicitud.excluirCitaId
    );
    const cargaActualDia = reservasDia.length;
    const minutosOcupadosDia = reservasDia.reduce(
      (acc, r) => acc + (r.finMin - r.inicioMin),
      0
    );

    if (!recurso.activo) {
      return {
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        tipo: recurso.tipo,
        disponible: false,
        motivo: "RECURSO_INACTIVO",
        detalle: `El recurso "${recurso.nombre}" se encuentra inactivo.`,
        cargaActualDia,
        minutosOcupadosDia,
        concurrenciaPicoEnSlot: 0,
        capacidadSimultanea,
        citasEnConflicto: [],
      };
    }

    if (
      !recurso.serviciosCompatiblesIds.some(
        (id) => id.trim() === solicitud.servicioId.trim()
      )
    ) {
      return {
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        tipo: recurso.tipo,
        disponible: false,
        motivo: "SERVICIO_NO_COMPATIBLE",
        detalle: `El recurso "${recurso.nombre}" no está habilitado para el servicio "${solicitud.servicioId}".`,
        cargaActualDia,
        minutosOcupadosDia,
        concurrenciaPicoEnSlot: 0,
        capacidadSimultanea,
        citasEnConflicto: [],
      };
    }

    const diaSemana = obtenerDiaSemanaUTC(solicitud.fecha);
    const horarioRecurso = recurso.horarioPorDia
      ? recurso.horarioPorDia[diaSemana] ?? null
      : HORARIO_CONTINUO_24H;

    const buffersRecurso = resolverBuffersRecurso(recurso.bufferLimpiezaMin);
    const bufAntesSolicitado =
      solicitud.bufferAntesMin !== undefined
        ? Math.max(0, solicitud.bufferAntesMin)
        : buffersRecurso.antes;
    const bufDespuesSolicitado =
      solicitud.bufferDespuesMin !== undefined
        ? Math.max(0, solicitud.bufferDespuesMin)
        : buffersRecurso.despues;

    const bloqueosMantenimiento = obtenerBloqueosMantenimientoDelDia(
      recurso,
      solicitud.fecha
    );

    const slotInicioMin = horaAMinutos(solicitud.horaInicio);
    const slotFinMin = slotInicioMin + solicitud.duracionMin;
    const slotInicioConBuffer = slotInicioMin - bufAntesSolicitado;
    const slotFinConBuffer = slotFinMin + bufDespuesSolicitado;

    const reservasSolapadas = reservasDia.filter((r) =>
      intervalosConBufferSeSolapan(
        slotInicioConBuffer,
        slotFinConBuffer,
        r.efectivoInicioMin,
        r.efectivoFinMin
      )
    );

    const citasEnConflicto: CitaEnConflictoRecurso[] = reservasSolapadas.map(
      (r) => ({
        citaId: r.citaId,
        especialistaId: r.especialistaId,
        horaInicio: minutosAHora(r.inicioMin),
        horaFin: minutosAHora(r.finMin),
        inicioEfectivoConBuffer: minutosAHora(r.efectivoInicioMin),
        finEfectivoConBuffer: minutosAHora(r.efectivoFinMin),
      })
    );

    const concurrenciaPicoEnSlot = calcularPicoConcurrenciaEnRango(
      reservasSolapadas,
      slotInicioConBuffer,
      slotFinConBuffer
    );

    const citasParaMotor: CitaOcupada[] =
      capacidadSimultanea === 1
        ? reservasDia.map((r) => ({
            id: r.citaId,
            inicio: minutosAHora(r.inicioMin),
            fin: minutosAHora(r.finMin),
            bufferAntesMin: r.bufAntes,
            bufferDespuesMin: r.bufDespues,
          }))
        : [];

    const maxCitasMotor =
      capacidadSimultanea === 1 ? recurso.maxUsosDiarios : undefined;

    const diagnosticoMotor = evaluarDisponibilidadSlotEspecifico(
      solicitud.horaInicio,
      {
        horarioAtencion: horarioRecurso,
        duracionServicioMin: solicitud.duracionMin,
        bufferPreparacionMin: {
          antesMin: bufAntesSolicitado,
          despuesMin: bufDespuesSolicitado,
        },
        bufferIncluidoEnJornada: solicitud.bufferIncluidoEnJornada ?? false,
        bloqueosParciales: bloqueosMantenimiento,
        citasExistentes: citasParaMotor,
        excluirCitaId: solicitud.excluirCitaId,
        maxCitasDia: maxCitasMotor,
      }
    );

    if (!diagnosticoMotor.disponible) {
      const motivo = mapearMotivoSlotAContencion(
        diagnosticoMotor.motivo,
        capacidadSimultanea
      );
      const detalle =
        motivo === "EN_MANTENIMIENTO" && diagnosticoMotor.detalle
          ? `Recurso "${recurso.nombre}" en mantenimiento: ${diagnosticoMotor.detalle}.`
          : motivo === "COLISION_CITA_O_BUFFER"
            ? `Recurso "${recurso.nombre}" ocupado por ${citasEnConflicto.length} cita(s) concurrente(s) o su buffer de limpieza.`
            : `Recurso "${recurso.nombre}" no disponible (${motivo}).`;

      return {
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        tipo: recurso.tipo,
        disponible: false,
        motivo,
        detalle,
        cargaActualDia,
        minutosOcupadosDia,
        concurrenciaPicoEnSlot,
        capacidadSimultanea,
        citasEnConflicto,
      };
    }

    if (
      capacidadSimultanea > 1 &&
      recurso.maxUsosDiarios !== undefined &&
      recurso.maxUsosDiarios > 0 &&
      cargaActualDia >= recurso.maxUsosDiarios
    ) {
      return {
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        tipo: recurso.tipo,
        disponible: false,
        motivo: "CUPO_DIARIO_AGOTADO",
        detalle: `El recurso "${recurso.nombre}" alcanzó su cupo máximo diario de ${recurso.maxUsosDiarios} usos.`,
        cargaActualDia,
        minutosOcupadosDia,
        concurrenciaPicoEnSlot,
        capacidadSimultanea,
        citasEnConflicto,
      };
    }

    if (
      capacidadSimultanea > 1 &&
      concurrenciaPicoEnSlot >= capacidadSimultanea
    ) {
      return {
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        tipo: recurso.tipo,
        disponible: false,
        motivo: "CAPACIDAD_SIMULTANEA_AGOTADA",
        detalle: `El recurso "${recurso.nombre}" agotó su capacidad simultánea (${concurrenciaPicoEnSlot}/${capacidadSimultanea}) en la franja ${solicitud.horaInicio}.`,
        cargaActualDia,
        minutosOcupadosDia,
        concurrenciaPicoEnSlot,
        capacidadSimultanea,
        citasEnConflicto,
      };
    }

    return {
      recursoId: recurso.id,
      recursoNombre: recurso.nombre,
      tipo: recurso.tipo,
      disponible: true,
      motivo: "DISPONIBLE",
      detalle: `Recurso "${recurso.nombre}" disponible para el horario solicitado.`,
      cargaActualDia,
      minutosOcupadosDia,
      concurrenciaPicoEnSlot,
      capacidadSimultanea,
      citasEnConflicto: [],
    };
  }

  /**
   * Asigna el recurso físico compatible de menor carga (o preferido si aplica)
   * y rechaza contención con diagnóstico semántico `SIN_RECURSO_FISICO_DISPONIBLE`.
   */
  public static asignarRecursoOptimo(
    solicitud: SolicitudAsignacionRecursoFisico,
    recursos: readonly RecursoFisico[]
  ): ResultadoAsignacionRecursoFisico {
    const estrategia: EstrategiaAsignacionRecurso =
      solicitud.estrategia ?? "MENOR_CARGA";

    const compatibles = this.filtrarCompatibles(solicitud.servicioId, recursos, {
      negocioId: solicitud.negocioId,
      tipoRecursoRequerido: solicitud.tipoRecursoRequerido,
      excluirRecursoIds: solicitud.excluirRecursoIds,
    });

    if (compatibles.length === 0) {
      return {
        asignado: false,
        codigoDiagnostico: "SIN_RECURSO_COMPATIBLE",
        recursoId: null,
        recursoNombre: null,
        tipoRecurso: null,
        estrategiaAplicada: estrategia,
        recursosCompatiblesCount: 0,
        recursosDisponiblesCount: 0,
        cargaRecursoAsignado: null,
        motivoRechazo: `No existen recursos físicos activos compatibles con el servicio "${solicitud.servicioId}".`,
        conflictosDetectados: [],
        alternativasDisponibles: [],
      };
    }

    const evaluaciones = compatibles.map((recurso) => ({
      recurso,
      diagnostico: this.verificarDisponibilidadRecurso(recurso, solicitud),
    }));

    const disponibles = evaluaciones.filter((e) => e.diagnostico.disponible);
    const conflictos = evaluaciones
      .filter((e) => !e.diagnostico.disponible)
      .map((e) => e.diagnostico);

    if (disponibles.length === 0) {
      const resumenConflictos = conflictos
        .map((c) => `${c.recursoNombre}: ${c.motivo}`)
        .join("; ");

      return {
        asignado: false,
        codigoDiagnostico: "SIN_RECURSO_FISICO_DISPONIBLE",
        recursoId: null,
        recursoNombre: null,
        tipoRecurso: null,
        estrategiaAplicada: estrategia,
        recursosCompatiblesCount: compatibles.length,
        recursosDisponiblesCount: 0,
        cargaRecursoAsignado: null,
        motivoRechazo: `Contención de recurso físico en ${solicitud.fecha} a las ${solicitud.horaInicio}: todos los recursos compatibles están ocupados o bloqueados (${resumenConflictos}).`,
        conflictosDetectados: conflictos,
        alternativasDisponibles: [],
      };
    }

    let elegido: (typeof disponibles)[number] | undefined;

    if (
      estrategia === "PREFERENCIA_RECURSO" &&
      solicitud.recursoPreferidoId
    ) {
      elegido = disponibles.find(
        (d) => d.recurso.id === solicitud.recursoPreferidoId
      );
    }

    if (!elegido) {
      const ordenados = [...disponibles].sort((a, b) => {
        const diffCitas =
          a.diagnostico.cargaActualDia - b.diagnostico.cargaActualDia;
        if (diffCitas !== 0) return diffCitas;

        const diffMin =
          a.diagnostico.minutosOcupadosDia - b.diagnostico.minutosOcupadosDia;
        if (diffMin !== 0) return diffMin;

        const diffCapacidad =
          a.diagnostico.capacidadSimultanea - b.diagnostico.capacidadSimultanea;
        if (diffCapacidad !== 0) return diffCapacidad;

        const diffPrio =
          (b.recurso.prioridadPreferencia ?? 0) -
          (a.recurso.prioridadPreferencia ?? 0);
        if (diffPrio !== 0) return diffPrio;

        return a.recurso.id.localeCompare(b.recurso.id);
      });
      elegido = ordenados[0]!;
    }

    const alternativasDisponibles: AlternativaRecursoDisponible[] = disponibles
      .filter((d) => d.recurso.id !== elegido!.recurso.id)
      .sort(
        (a, b) =>
          a.diagnostico.cargaActualDia - b.diagnostico.cargaActualDia ||
          a.diagnostico.minutosOcupadosDia - b.diagnostico.minutosOcupadosDia ||
          a.recurso.id.localeCompare(b.recurso.id)
      )
      .map((d) => ({
        recursoId: d.recurso.id,
        recursoNombre: d.recurso.nombre,
        tipo: d.recurso.tipo,
        cargaActualDia: d.diagnostico.cargaActualDia,
        minutosOcupadosDia: d.diagnostico.minutosOcupadosDia,
      }));

    return {
      asignado: true,
      codigoDiagnostico: "RECURSO_ASIGNADO",
      recursoId: elegido.recurso.id,
      recursoNombre: elegido.recurso.nombre,
      tipoRecurso: elegido.recurso.tipo,
      estrategiaAplicada: estrategia,
      recursosCompatiblesCount: compatibles.length,
      recursosDisponiblesCount: disponibles.length,
      cargaRecursoAsignado: elegido.diagnostico.cargaActualDia,
      conflictosDetectados: conflictos,
      alternativasDisponibles,
    };
  }

  /**
   * Asigna atómicamente múltiples recursos físicos distintos requeridos de forma
   * simultánea por una misma cita (ej. Cabina + Equipo Láser), abortando sin
   * asignaciones parciales si cualquiera presenta contención.
   */
  public static asignarRecursosMultiples(
    solicitud: SolicitudAsignacionMultipleRecursos,
    recursos: readonly RecursoFisico[]
  ): ResultadoAsignacionMultipleRecursos {
    if (solicitud.requisitos.length === 0) {
      throw new Error(
        "Debe especificar al menos un requisito físico para asignación múltiple."
      );
    }

    const asignaciones: ResultadoAsignacionRecursoFisico[] = [];
    const yaReservadosIds: string[] = [];

    for (const req of solicitud.requisitos) {
      const resultado = this.asignarRecursoOptimo(
        {
          negocioId: solicitud.negocioId,
          servicioId: solicitud.servicioId,
          fecha: solicitud.fecha,
          horaInicio: solicitud.horaInicio,
          duracionMin: solicitud.duracionMin,
          tipoRecursoRequerido: req.tipoRecursoRequerido,
          recursoPreferidoId: req.recursoPreferidoId,
          estrategia: solicitud.estrategia,
          bufferAntesMin: req.bufferAntesMin,
          bufferDespuesMin: req.bufferDespuesMin,
          bufferIncluidoEnJornada: solicitud.bufferIncluidoEnJornada,
          excluirCitaId: solicitud.excluirCitaId,
          excluirRecursoIds: yaReservadosIds,
        },
        recursos
      );

      if (!resultado.asignado || !resultado.recursoId) {
        return {
          asignado: false,
          codigoDiagnostico: resultado.codigoDiagnostico,
          asignaciones: [],
          recursosAsignadosIds: [],
          motivoRechazo: resultado.motivoRechazo,
          conflictosDetectados: resultado.conflictosDetectados,
        };
      }

      yaReservadosIds.push(resultado.recursoId);
      asignaciones.push(resultado);
    }

    return {
      asignado: true,
      codigoDiagnostico: "RECURSO_ASIGNADO",
      asignaciones,
      recursosAsignadosIds: yaReservadosIds,
      conflictosDetectados: [],
    };
  }

  /**
   * Calcula todos los slots de inicio en una jornada donde existe al menos
   * un recurso físico compatible disponible sin contención.
   */
  public static calcularSlotsDisponiblesConRecurso(
    params: CalcularSlotsConRecursoParams
  ): string[] {
    if (!params.horarioAtencion || params.horarioAtencion.activo === false) {
      return [];
    }

    const compatibles = this.filtrarCompatibles(
      params.servicioId,
      params.recursos,
      {
        negocioId: params.negocioId,
        tipoRecursoRequerido: params.tipoRecursoRequerido,
      }
    );

    if (compatibles.length === 0 || params.duracionServicioMin <= 0) {
      return [];
    }

    const paso = params.pasoMin && params.pasoMin > 0 ? params.pasoMin : 30;
    const candidatosBase = calcularSlotsDisponibles({
      horarioAtencion: params.horarioAtencion,
      duracionServicioMin: params.duracionServicioMin,
      pasoMin: paso,
      bufferPreparacionMin: {
        antesMin: params.bufferAntesMin ?? 0,
        despuesMin: params.bufferDespuesMin ?? 0,
      },
      bufferIncluidoEnJornada: params.bufferIncluidoEnJornada ?? false,
    });

    return candidatosBase.filter((horaInicio) => {
      const resultado = this.asignarRecursoOptimo(
        {
          negocioId: params.negocioId,
          servicioId: params.servicioId,
          fecha: params.fecha,
          horaInicio,
          duracionMin: params.duracionServicioMin,
          tipoRecursoRequerido: params.tipoRecursoRequerido,
          bufferAntesMin: params.bufferAntesMin,
          bufferDespuesMin: params.bufferDespuesMin,
          bufferIncluidoEnJornada: params.bufferIncluidoEnJornada,
          excluirCitaId: params.excluirCitaId,
        },
        compatibles
      );
      return resultado.asignado;
    });
  }
}
