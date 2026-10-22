import { IReservasRepository } from "../repositories";
import { Failure, crearFailure } from "@/shared/errors";
import {
  calcularSlotsDisponibles,
  HorarioAtencionDia,
  LunchBreak,
  CitaOcupada,
  BufferPreparacionConfig,
  IntervaloBloqueo,
  ExcepcionDisponibilidadDia,
} from "../motorDisponibilidad";

export interface GenerarSlotsInput {
  // Parámetros de dominio directo
  horarioAtencion?: HorarioAtencionDia | null;
  horarioLaboral?: HorarioAtencionDia | null; // Alias
  duracionServicioMin?: number;
  intervaloServicioMin?: number; // Alias
  duracionMin?: number; // Alias
  bufferPreparacionMin?: number | BufferPreparacionConfig;
  bufferMin?: number; // Alias
  lunchBreak?: LunchBreak | null;
  descansos?: LunchBreak[];
  bloqueosParciales?: IntervaloBloqueo[];
  excepcionFecha?: ExcepcionDisponibilidadDia | null;
  citasExistentes?: CitaOcupada[];
  citas?: CitaOcupada[]; // Alias
  excluirCitaId?: string;
  pasoMin?: number;
  bufferIncluidoEnJornada?: boolean;
  anticipacionMinimaMin?: number;
  anticipacionMaximaDias?: number;
  fechaObjetivo?: string;
  ahoraReferencia?: Date | string;
  maxCitasDia?: number;
  retornarFailureEnBloqueo?: boolean;

  // Parámetros opcionales para consulta delegada en repositorio
  negocioId?: string;
  fecha?: string; // Formato YYYY-MM-DD
  servicioId?: string;
}

export class GenerarSlotsDisponiblesUseCase {
  constructor(private repository?: IReservasRepository) {}

  async execute(
    input: GenerarSlotsInput
  ): Promise<{ data?: string[]; failure?: Failure }> {
    // 1. Si se solicita consulta persistida a través de repositorio
    if (input.negocioId && input.fecha && input.servicioId && this.repository) {
      return this.repository.obtenerSlotsDisponibles(
        input.negocioId,
        input.fecha,
        input.servicioId
      );
    }

    // 2. Extraer y validar duración del servicio
    const duracion =
      input.duracionServicioMin ??
      input.intervaloServicioMin ??
      input.duracionMin;

    if (duracion === undefined || duracion === null || isNaN(duracion)) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "La duración o intervalo del servicio es obligatoria."
        ),
      };
    }

    if (duracion <= 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "La duración del servicio debe ser mayor a 0 minutos."
        ),
      };
    }

    // 3. Validar paso, buffers, anticipación y cupo diario si se especifican
    if (input.pasoMin !== undefined && input.pasoMin <= 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El intervalo o paso entre slots debe ser mayor a 0 minutos."
        ),
      };
    }

    const bufferEvaluado = input.bufferPreparacionMin ?? input.bufferMin;
    if (typeof bufferEvaluado === "number" && bufferEvaluado < 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El tiempo de buffer o preparación no puede ser negativo."
        ),
      };
    }
    if (
      typeof bufferEvaluado === "object" &&
      bufferEvaluado !== null &&
      ((bufferEvaluado.antesMin !== undefined && bufferEvaluado.antesMin < 0) ||
        (bufferEvaluado.despuesMin !== undefined && bufferEvaluado.despuesMin < 0))
    ) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "Los buffers de preparación previa y limpieza posterior no pueden ser negativos."
        ),
      };
    }

    if (
      input.anticipacionMinimaMin !== undefined &&
      input.anticipacionMinimaMin < 0
    ) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "La anticipación mínima en minutos no puede ser negativa."
        ),
      };
    }

    if (input.maxCitasDia !== undefined && input.maxCitasDia <= 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El cupo máximo diario debe ser mayor a 0 citas."
        ),
      };
    }

    // 4. Evaluar cierre especial o feriado en la fecha consultada
    if (input.excepcionFecha?.cerradoCompleto) {
      if (input.retornarFailureEnBloqueo) {
        const motivo = input.excepcionFecha.motivo
          ? `No hay servicio disponible por: ${input.excepcionFecha.motivo}.`
          : "La fecha seleccionada se encuentra cerrada por feriado o bloqueo especial.";
        return {
          failure: crearFailure("FECHA_BLOQUEADA", motivo),
        };
      }
      return { data: [] };
    }

    // 5. Verificar horario del día (permitiendo sobrescritura por horario especial)
    const horario = input.horarioAtencion ?? input.horarioLaboral;
    const tieneHorarioEspecial = Boolean(
      input.excepcionFecha?.abreEspecial && input.excepcionFecha?.cierraEspecial
    );

    if (!tieneHorarioEspecial && (!horario || horario.activo === false)) {
      return { data: [] };
    }

    // 6. Ejecutar motor de cálculo puro
    const slots = calcularSlotsDisponibles({
      horarioAtencion: horario,
      duracionServicioMin: duracion,
      bufferPreparacionMin: bufferEvaluado,
      lunchBreak: input.lunchBreak,
      descansos: input.descansos,
      bloqueosParciales: input.bloqueosParciales,
      excepcionFecha: input.excepcionFecha,
      citasExistentes: input.citasExistentes ?? input.citas,
      excluirCitaId: input.excluirCitaId,
      pasoMin: input.pasoMin,
      bufferIncluidoEnJornada: input.bufferIncluidoEnJornada,
      anticipacionMinimaMin: input.anticipacionMinimaMin,
      anticipacionMaximaDias: input.anticipacionMaximaDias,
      fechaObjetivo: input.fechaObjetivo ?? input.fecha,
      ahoraReferencia: input.ahoraReferencia,
      maxCitasDia: input.maxCitasDia,
    });

    return { data: slots };
  }
}
