/**
 * Motor Puro de Proyección y Planificación de Citas Recurrentes.
 *
 * Genera series cronológicas (semanales, quincenales, mensuales) con resolución determinística
 * de conflictos contra feriados, bloqueos y citas previas, evaluando factibilidad
 * completa o estrategias de salto de colisiones.
 */

import { horaAMinutos, type CitaOcupada } from "./motorDisponibilidad";

export type FrecuenciaRecurrencia = "semanal" | "quincenal" | "mensual";

export type EstrategiaConflictoRecurrente =
  | "abortar_si_hay_conflicto"
  | "saltar_conflictos";

export interface ProyeccionCitaRecurrenteInput {
  negocioId: string;
  servicioId: string;
  fechaInicio: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  frecuencia: FrecuenciaRecurrencia;
  totalOcurrencias: number;
  fechaLimiteMaxima?: string; // "YYYY-MM-DD"
  estrategiaConflicto?: EstrategiaConflictoRecurrente;
  feriadosOFechasBloqueadas?: string[]; // Array de "YYYY-MM-DD"
  citasExistentes?: CitaOcupada[];
}

export type EstadoOcurrenciaRecurrente =
  | "valida"
  | "conflicto_feriado"
  | "conflicto_cita"
  | "fecha_limite_excedida";

export interface OcurrenciaRecurrente {
  indice: number; // 1-based (1, 2, 3...)
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  inicio: Date;
  fin: Date;
  estado: EstadoOcurrenciaRecurrente;
  motivoConflicto?: string;
}

export interface PlanSerieRecurrente {
  negocioId: string;
  servicioId: string;
  frecuencia: FrecuenciaRecurrencia;
  totalSolicitado: number;
  totalValidas: number;
  totalConflictivas: number;
  esCompletamenteFactible: boolean;
  ocurrencias: OcurrenciaRecurrente[];
  ocurrenciasValidas: OcurrenciaRecurrente[];
  ocurrenciasConflictivas: OcurrenciaRecurrente[];
}

function formatearFechaISO(d: Date): string {
  const anio = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function parsearFechaUTC(fechaStr: string): Date {
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  return new Date(Date.UTC(anio ?? 2026, (mes ?? 1) - 1, dia ?? 1));
}

function avanzarFechaPorFrecuencia(
  fechaBase: Date,
  frecuencia: FrecuenciaRecurrencia,
  paso: number,
): Date {
  const d = new Date(fechaBase.getTime());
  if (frecuencia === "semanal") {
    d.setUTCDate(d.getUTCDate() + paso * 7);
  } else if (frecuencia === "quincenal") {
    d.setUTCDate(d.getUTCDate() + paso * 14);
  } else if (frecuencia === "mensual") {
    d.setUTCMonth(d.getUTCMonth() + paso);
  }
  return d;
}

/**
 * Valida las reglas de dominio para generar una serie recurrente.
 */
export function validarInputSerieRecurrente(
  input: ProyeccionCitaRecurrenteInput,
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (!input.negocioId?.trim()) {
    errores.push("El identificador del negocio es obligatorio.");
  }

  if (!input.servicioId?.trim()) {
    errores.push("El identificador del servicio es obligatorio.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fechaInicio?.trim())) {
    errores.push("La fecha de inicio debe tener formato YYYY-MM-DD válido.");
  }

  const iniMin = horaAMinutos(input.horaInicio);
  const finMin = horaAMinutos(input.horaFin);
  if (finMin <= iniMin) {
    errores.push("La hora de inicio debe ser estrictamente anterior a la hora de fin.");
  }

  if (!Number.isInteger(input.totalOcurrencias) || input.totalOcurrencias < 2) {
    errores.push("Una serie recurrente debe incluir al menos 2 ocurrencias.");
  } else if (input.totalOcurrencias > 52) {
    errores.push("El límite máximo por serie es de 52 ocurrencias.");
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Proyecta la serie completa evaluando cada ocurrencia contra feriados, bloqueos
 * y citas previas para producir un plan de ejecución transaccional.
 */
export function proyectarPlanSerieRecurrente(
  input: ProyeccionCitaRecurrenteInput,
): PlanSerieRecurrente {
  const feriadosSet = new Set(
    (input.feriadosOFechasBloqueadas ?? []).map((f) => f.trim()),
  );

  const fechaInicialUTC = parsearFechaUTC(input.fechaInicio);
  const fechaLimiteUTC = input.fechaLimiteMaxima
    ? parsearFechaUTC(input.fechaLimiteMaxima)
    : null;

  const [iniH, iniM] = input.horaInicio.split(":").map(Number);
  const [finH, finM] = input.horaFin.split(":").map(Number);

  const ocurrencias: OcurrenciaRecurrente[] = [];

  for (let i = 0; i < input.totalOcurrencias; i += 1) {
    const fechaOcurrencia = avanzarFechaPorFrecuencia(
      fechaInicialUTC,
      input.frecuencia,
      i,
    );
    const fechaStr = formatearFechaISO(fechaOcurrencia);

    const inicioDate = new Date(
      Date.UTC(
        fechaOcurrencia.getUTCFullYear(),
        fechaOcurrencia.getUTCMonth(),
        fechaOcurrencia.getUTCDate(),
        iniH ?? 0,
        iniM ?? 0,
      ),
    );

    const finDate = new Date(
      Date.UTC(
        fechaOcurrencia.getUTCFullYear(),
        fechaOcurrencia.getUTCMonth(),
        fechaOcurrencia.getUTCDate(),
        finH ?? 0,
        finM ?? 0,
      ),
    );

    let estado: EstadoOcurrenciaRecurrente = "valida";
    let motivoConflicto: string | undefined;

    // 1. Validar fecha límite
    if (fechaLimiteUTC && fechaOcurrencia.getTime() > fechaLimiteUTC.getTime()) {
      estado = "fecha_limite_excedida";
      motivoConflicto = `La fecha ${fechaStr} excede la fecha límite máxima permitida (${input.fechaLimiteMaxima}).`;
    }
    // 2. Validar feriado o cierre
    else if (feriadosSet.has(fechaStr)) {
      estado = "conflicto_feriado";
      motivoConflicto = `La fecha ${fechaStr} está marcada como feriado o día no laborable.`;
    }
    // 3. Validar colisión con citas existentes
    else if (input.citasExistentes && input.citasExistentes.length > 0) {
      const inicioMs = inicioDate.getTime();
      const finMs = finDate.getTime();

      for (const cita of input.citasExistentes) {
        const estadoCita = (cita.estado ?? "confirmada").trim().toLowerCase();
        if (estadoCita === "cancelada" || estadoCita === "cancelado") {
          continue;
        }

        const citaIniMs =
          cita.inicio instanceof Date
            ? cita.inicio.getTime()
            : new Date(cita.inicio).getTime();
        const citaFinMs =
          cita.fin instanceof Date
            ? cita.fin.getTime()
            : new Date(cita.fin).getTime();

        if (isNaN(citaIniMs) || isNaN(citaFinMs)) {
          continue;
        }

        // Traslape de intervalos
        if (inicioMs < citaFinMs && finMs > citaIniMs) {
          estado = "conflicto_cita";
          motivoConflicto = `Conflicto de horario con cita existente en ${fechaStr} (${input.horaInicio} - ${input.horaFin}).`;
          break;
        }
      }
    }

    ocurrencias.push({
      indice: i + 1,
      fecha: fechaStr,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      inicio: inicioDate,
      fin: finDate,
      estado,
      ...(motivoConflicto ? { motivoConflicto } : {}),
    });
  }

  const ocurrenciasValidas = ocurrencias.filter((o) => o.estado === "valida");
  const ocurrenciasConflictivas = ocurrencias.filter((o) => o.estado !== "valida");

  return {
    negocioId: input.negocioId,
    servicioId: input.servicioId,
    frecuencia: input.frecuencia,
    totalSolicitado: input.totalOcurrencias,
    totalValidas: ocurrenciasValidas.length,
    totalConflictivas: ocurrenciasConflictivas.length,
    esCompletamenteFactible: ocurrenciasConflictivas.length === 0,
    ocurrencias,
    ocurrenciasValidas,
    ocurrenciasConflictivas,
  };
}
