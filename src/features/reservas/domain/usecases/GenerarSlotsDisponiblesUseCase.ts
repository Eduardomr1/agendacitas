import { IReservasRepository } from "../repositories";
import { Failure, crearFailure } from "@/shared/errors";
import {
  calcularSlotsDisponibles,
  HorarioAtencionDia,
  LunchBreak,
  CitaOcupada,
  BufferPreparacionConfig,
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
  citasExistentes?: CitaOcupada[];
  citas?: CitaOcupada[]; // Alias
  pasoMin?: number;
  bufferIncluidoEnJornada?: boolean;

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

    // 3. Validar paso si se especifica
    if (input.pasoMin !== undefined && input.pasoMin <= 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El intervalo o paso entre slots debe ser mayor a 0 minutos."
        ),
      };
    }

    // 4. Verificar horario del día
    const horario = input.horarioAtencion ?? input.horarioLaboral;
    if (!horario || horario.activo === false) {
      return { data: [] }; // Día no laborable / cerrado
    }

    // 5. Ejecutar motor de cálculo puro
    const slots = calcularSlotsDisponibles({
      horarioAtencion: horario,
      duracionServicioMin: duracion,
      bufferPreparacionMin: input.bufferPreparacionMin ?? input.bufferMin,
      lunchBreak: input.lunchBreak,
      descansos: input.descansos,
      citasExistentes: input.citasExistentes ?? input.citas,
      pasoMin: input.pasoMin,
      bufferIncluidoEnJornada: input.bufferIncluidoEnJornada,
    });

    return { data: slots };
  }
}
