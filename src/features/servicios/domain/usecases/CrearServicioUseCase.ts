import { IServiciosRepository } from "../repositories";
import { CrearServicioInput, ServicioItem } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

export class CrearServicioUseCase {
  constructor(private repository: IServiciosRepository) {}

  async execute(
    input: CrearServicioInput
  ): Promise<{ data?: ServicioItem; failure?: Failure }> {
    if (!input.nombre.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El nombre del servicio no puede estar vacío."
        ),
      };
    }

    if (input.duracionMin <= 0 || input.duracionMin > 480) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "La duración debe ser entre 1 minuto y 480 minutos (8 horas)."
        ),
      };
    }

    if (input.precioCentavos < 0) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El precio del servicio no puede ser negativo."
        ),
      };
    }

    return this.repository.crearServicio(input);
  }
}
