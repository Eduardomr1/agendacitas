import { ICitasAdminRepository } from "../repositories";
import { EstadoCita } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

const ESTADOS_VALIDOS: readonly EstadoCita[] = ["confirmada", "cancelada", "completada"];

export class ActualizarEstadoCitaUseCase {
  constructor(private repository: ICitasAdminRepository) {}

  async execute(
    citaId: string,
    nuevoEstado: EstadoCita
  ): Promise<{ failure?: Failure }> {
    if (!citaId || !citaId.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El identificador de la cita es requerido."
        ),
      };
    }

    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          `El estado '${nuevoEstado}' no es válido. Debe ser: confirmada, cancelada o completada.`
        ),
      };
    }

    return this.repository.actualizarEstadoCita(citaId.trim(), nuevoEstado);
  }
}
