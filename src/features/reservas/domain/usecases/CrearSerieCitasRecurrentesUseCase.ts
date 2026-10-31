/**
 * Caso de Uso: Creación de Series de Citas Recurrentes con Garantía Transaccional.
 *
 * Proyecta y persiste atómicamente series semanales, quincenales o mensuales.
 * En caso de conflicto parcial (feriado o cita existente), aborta la serie completa
 * con rollback transaccional o agenda exclusivamente las ocurrencias factibles
 * según la estrategia configurada.
 */

import { crearFailure, type Failure } from "@/shared/errors";
import type { CitaResultado, CitaSolicitud } from "../entities";
import type { CitaOcupada } from "../motorDisponibilidad";
import {
  proyectarPlanSerieRecurrente,
  validarInputSerieRecurrente,
  type EstrategiaConflictoRecurrente,
  type FrecuenciaRecurrencia,
  type PlanSerieRecurrente,
} from "../citasRecurrentes";

export interface ISerieRecurrentePort {
  obtenerFeriadosYBloqueos(negocioId: string): Promise<string[]>;
  obtenerCitasEnRango(
    negocioId: string,
    inicio: Date,
    fin: Date,
  ): Promise<CitaOcupada[]>;
  crearSerieTransaccional(
    citas: CitaSolicitud[],
  ): Promise<{ data?: CitaResultado[]; failure?: Failure }>;
}

export interface CrearSerieCitasRecurrentesInput {
  negocioId: string;
  servicioId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  fechaInicio: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  frecuencia: FrecuenciaRecurrencia;
  totalOcurrencias: number;
  fechaLimiteMaxima?: string;
  estrategiaConflicto?: EstrategiaConflictoRecurrente;
}

export interface CrearSerieCitasRecurrentesOutput {
  plan: PlanSerieRecurrente;
  citasCreadas: CitaResultado[];
  totalOcurrenciasAgendadas: number;
  estrategiaAplicada: EstrategiaConflictoRecurrente;
}

export class CrearSerieCitasRecurrentesUseCase {
  constructor(private readonly repository: ISerieRecurrentePort) {}

  async execute(
    input: CrearSerieCitasRecurrentesInput,
  ): Promise<{ data?: CrearSerieCitasRecurrentesOutput; failure?: Failure }> {
    const validacion = validarInputSerieRecurrente({
      negocioId: input.negocioId,
      servicioId: input.servicioId,
      fechaInicio: input.fechaInicio,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      frecuencia: input.frecuencia,
      totalOcurrencias: input.totalOcurrencias,
      fechaLimiteMaxima: input.fechaLimiteMaxima,
    });

    if (!validacion.valido) {
      return {
        failure: crearFailure("DATOS_INVALIDOS", validacion.errores.join(" ")),
      };
    }

    if (!input.clienteNombre?.trim()) {
      return {
        failure: crearFailure("DATOS_INVALIDOS", "El nombre del cliente es obligatorio."),
      };
    }

    if (!input.clienteEmail?.includes("@")) {
      return {
        failure: crearFailure("DATOS_INVALIDOS", "Por favor ingresa un correo electrónico válido."),
      };
    }

    const estrategia = input.estrategiaConflicto ?? "abortar_si_hay_conflicto";

    const feriados = await this.repository.obtenerFeriadosYBloqueos(input.negocioId);

    // Calcular horizonte temporal de la serie para consultar citas existentes
    const diasHorizonte =
      input.frecuencia === "semanal"
        ? input.totalOcurrencias * 7
        : input.frecuencia === "quincenal"
          ? input.totalOcurrencias * 14
          : input.totalOcurrencias * 31;

    const [anio, mes, dia] = input.fechaInicio.split("-").map(Number);
    const fechaIniRango = new Date(Date.UTC(anio ?? 2026, (mes ?? 1) - 1, dia ?? 1));
    const fechaFinRango = new Date(fechaIniRango.getTime() + diasHorizonte * 86_400_000);

    const citasExistentes = await this.repository.obtenerCitasEnRango(
      input.negocioId,
      fechaIniRango,
      fechaFinRango,
    );

    const plan = proyectarPlanSerieRecurrente({
      negocioId: input.negocioId,
      servicioId: input.servicioId,
      fechaInicio: input.fechaInicio,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      frecuencia: input.frecuencia,
      totalOcurrencias: input.totalOcurrencias,
      fechaLimiteMaxima: input.fechaLimiteMaxima,
      feriadosOFechasBloqueadas: feriados,
      citasExistentes,
    });

    if (estrategia === "abortar_si_hay_conflicto" && !plan.esCompletamenteFactible) {
      const motivos = plan.ocurrenciasConflictivas
        .map((o) => `Ocurrencia #${o.indice} (${o.fecha}): ${o.motivoConflicto}`)
        .join("; ");
      return {
        failure: crearFailure(
          "CONFLICTO_SERIE_RECURRENTE",
          `La serie no se pudo agendar porque ${plan.totalConflictivas} cita(s) presentan conflicto.`,
          motivos,
        ),
      };
    }

    const ocurrenciasParaAgendar =
      estrategia === "saltar_conflictos"
        ? plan.ocurrenciasValidas
        : plan.ocurrencias;

    if (ocurrenciasParaAgendar.length === 0) {
      return {
        failure: crearFailure(
          "CONFLICTO_SERIE_RECURRENTE",
          "No existen fechas disponibles sin conflicto para la serie solicitada.",
        ),
      };
    }

    const solicitudes: CitaSolicitud[] = ocurrenciasParaAgendar.map((o) => ({
      negocioId: input.negocioId,
      servicioId: input.servicioId,
      inicio: o.inicio,
      fin: o.fin,
      clienteNombre: input.clienteNombre,
      clienteEmail: input.clienteEmail,
      clienteTelefono: input.clienteTelefono,
    }));

    const resultadoTransaccion = await this.repository.crearSerieTransaccional(solicitudes);

    if (resultadoTransaccion.failure || !resultadoTransaccion.data) {
      return {
        failure:
          resultadoTransaccion.failure ??
          crearFailure("CONFLICTO_SERIE_RECURRENTE", "Error en rollback al persistir serie."),
      };
    }

    return {
      data: {
        plan,
        citasCreadas: resultadoTransaccion.data,
        totalOcurrenciasAgendadas: resultadoTransaccion.data.length,
        estrategiaAplicada: estrategia,
      },
    };
  }
}
