import { crearFailure, type Failure } from "@/shared/errors";
import type { HorarioAtencionDia } from "../motorDisponibilidad";
import {
  MotorRecursosFisicos,
  type EstrategiaAsignacionRecurso,
  type RecursoFisico,
  type RequisitoRecursoMultiple,
  type ResultadoAsignacionMultipleRecursos,
  type ResultadoAsignacionRecursoFisico,
  type SolicitudAsignacionRecursoFisico,
  type TipoRecursoFisico,
} from "../recursosFisicos";

export interface AsignarRecursoFisicoCommand {
  readonly negocioId: string;
  readonly solicitud: Omit<SolicitudAsignacionRecursoFisico, "negocioId">;
  readonly recursos: readonly RecursoFisico[];
}

export interface ResultadoAsignacionRecursoUseCase
  extends ResultadoAsignacionRecursoFisico {
  readonly failure?: Failure;
}

export interface AsignarMultiplesRecursosCommand {
  readonly negocioId: string;
  readonly servicioId: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly duracionMin: number;
  readonly requisitos: readonly RequisitoRecursoMultiple[];
  readonly recursos: readonly RecursoFisico[];
  readonly estrategia?: EstrategiaAsignacionRecurso;
  readonly bufferIncluidoEnJornada?: boolean;
  readonly excluirCitaId?: string;
}

export interface ResultadoAsignacionMultipleUseCase
  extends ResultadoAsignacionMultipleRecursos {
  readonly failure?: Failure;
}

export interface CalcularSlotsConRecursoCommand {
  readonly negocioId: string;
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

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function esFechaCalendarioValida(fecha: string): boolean {
  if (!REGEX_FECHA_ISO.test(fecha.trim())) {
    return false;
  }
  const [anio, mes, dia] = fecha.trim().split("-").map(Number);
  const utc = new Date(Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 0));
  return (
    utc.getUTCFullYear() === anio &&
    utc.getUTCMonth() === (mes ?? 1) - 1 &&
    utc.getUTCDate() === dia
  );
}

function validarDatosBasicosSolicitud(params: {
  negocioId: string;
  servicioId: string;
  fecha: string;
  horaInicio?: string;
  duracionMin: number;
  bufferAntesMin?: number;
  bufferDespuesMin?: number;
}): void {
  if (!params.negocioId || params.negocioId.trim().length === 0) {
    throw new Error(
      "El negocioId es obligatorio para evaluar disponibilidad de recursos físicos."
    );
  }
  if (!params.servicioId || params.servicioId.trim().length === 0) {
    throw new Error(
      "El servicioId es obligatorio para asignar un recurso físico."
    );
  }
  if (!esFechaCalendarioValida(params.fecha)) {
    throw new Error("La fecha debe tener formato YYYY-MM-DD válido.");
  }
  if (
    params.horaInicio !== undefined &&
    !REGEX_HORA_HHMM.test(params.horaInicio.trim())
  ) {
    throw new Error("La hora de inicio debe tener formato HH:MM válido.");
  }
  if (!Number.isFinite(params.duracionMin) || params.duracionMin <= 0) {
    throw new Error("La duración del servicio debe ser mayor a 0 minutos.");
  }
  if (
    params.bufferAntesMin !== undefined &&
    (!Number.isFinite(params.bufferAntesMin) || params.bufferAntesMin < 0)
  ) {
    throw new Error("El bufferAntesMin no puede ser negativo.");
  }
  if (
    params.bufferDespuesMin !== undefined &&
    (!Number.isFinite(params.bufferDespuesMin) || params.bufferDespuesMin < 0)
  ) {
    throw new Error("El bufferDespuesMin no puede ser negativo.");
  }
}

function mapearFailureContencion(
  codigoDiagnostico: ResultadoAsignacionRecursoFisico["codigoDiagnostico"],
  motivoRechazo?: string
): Failure {
  const tipo =
    codigoDiagnostico === "SIN_RECURSO_COMPATIBLE"
      ? "RECURSO_NO_ENCONTRADO"
      : "SIN_RECURSO_FISICO_DISPONIBLE";
  return crearFailure(
    tipo,
    motivoRechazo ??
      "No hay recursos físicos disponibles para el horario solicitado."
  );
}

/**
 * Caso de Uso de Dominio encargado de validar invariantes de entrada y
 * orquestar la asignación óptima sin contención de cabinas, salas de masaje,
 * equipos láser o estaciones compartidas.
 */
export class AsignarRecursoFisicoUseCase {
  public execute(
    command: AsignarRecursoFisicoCommand
  ): ResultadoAsignacionRecursoUseCase {
    const { negocioId, solicitud, recursos } = command;

    validarDatosBasicosSolicitud({
      negocioId,
      servicioId: solicitud.servicioId,
      fecha: solicitud.fecha,
      horaInicio: solicitud.horaInicio,
      duracionMin: solicitud.duracionMin,
      bufferAntesMin: solicitud.bufferAntesMin,
      bufferDespuesMin: solicitud.bufferDespuesMin,
    });

    const resultado = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        ...solicitud,
        negocioId: negocioId.trim(),
      },
      recursos
    );

    if (!resultado.asignado) {
      return {
        ...resultado,
        failure: mapearFailureContencion(
          resultado.codigoDiagnostico,
          resultado.motivoRechazo
        ),
      };
    }

    return resultado;
  }

  public asignarMultiplesRecursos(
    command: AsignarMultiplesRecursosCommand
  ): ResultadoAsignacionMultipleUseCase {
    validarDatosBasicosSolicitud({
      negocioId: command.negocioId,
      servicioId: command.servicioId,
      fecha: command.fecha,
      horaInicio: command.horaInicio,
      duracionMin: command.duracionMin,
    });

    if (!command.requisitos || command.requisitos.length === 0) {
      throw new Error(
        "Debe incluir al menos un requisito físico para asignación múltiple."
      );
    }

    const resultado = MotorRecursosFisicos.asignarRecursosMultiples(
      {
        negocioId: command.negocioId.trim(),
        servicioId: command.servicioId,
        fecha: command.fecha,
        horaInicio: command.horaInicio,
        duracionMin: command.duracionMin,
        requisitos: command.requisitos,
        estrategia: command.estrategia,
        bufferIncluidoEnJornada: command.bufferIncluidoEnJornada,
        excluirCitaId: command.excluirCitaId,
      },
      command.recursos
    );

    if (!resultado.asignado) {
      return {
        ...resultado,
        failure: mapearFailureContencion(
          resultado.codigoDiagnostico,
          resultado.motivoRechazo
        ),
      };
    }

    return resultado;
  }

  public calcularSlotsDisponibles(
    command: CalcularSlotsConRecursoCommand
  ): string[] {
    validarDatosBasicosSolicitud({
      negocioId: command.negocioId,
      servicioId: command.servicioId,
      fecha: command.fecha,
      duracionMin: command.duracionServicioMin,
      bufferAntesMin: command.bufferAntesMin,
      bufferDespuesMin: command.bufferDespuesMin,
    });

    return MotorRecursosFisicos.calcularSlotsDisponiblesConRecurso({
      negocioId: command.negocioId.trim(),
      servicioId: command.servicioId,
      fecha: command.fecha,
      horarioAtencion: command.horarioAtencion,
      duracionServicioMin: command.duracionServicioMin,
      recursos: command.recursos,
      tipoRecursoRequerido: command.tipoRecursoRequerido,
      pasoMin: command.pasoMin,
      bufferAntesMin: command.bufferAntesMin,
      bufferDespuesMin: command.bufferDespuesMin,
      bufferIncluidoEnJornada: command.bufferIncluidoEnJornada,
      excluirCitaId: command.excluirCitaId,
    });
  }
}
