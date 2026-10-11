import { IServiciosRepository } from "../repositories";
import { ActualizarServicioInput, ServicioItem } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

export class ActualizarServicioUseCase {
  constructor(private repository: IServiciosRepository) {}

  async execute(
    input: ActualizarServicioInput
  ): Promise<{ data?: ServicioItem; failure?: Failure }> {
    if (!input.id || !input.id.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El identificador del servicio es requerido para actualizar."
        ),
      };
    }

    if (input.nombre !== undefined && !input.nombre.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El nombre del servicio no puede estar vacío."
        ),
      };
    }

    if (
      input.duracionMin !== undefined &&
      (input.duracionMin <= 0 || input.duracionMin > 480)
    ) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "La duración debe ser entre 1 minuto y 480 minutos (8 horas)."
        ),
      };
    }

    if (input.precioCentavos !== undefined && input.precioCentavos < 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El precio del servicio no puede ser negativo."
        ),
      };
    }

    return this.repository.actualizarServicio({
      ...input,
      id: input.id.trim(),
      nombre: input.nombre !== undefined ? input.nombre.trim() : undefined,
      categoria: input.categoria !== undefined ? (input.categoria?.trim() || null) : undefined,
      descripcion: input.descripcion !== undefined ? (input.descripcion?.trim() || null) : undefined,
    });
  }
}
