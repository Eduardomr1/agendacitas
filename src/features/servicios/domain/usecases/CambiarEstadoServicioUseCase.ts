import { IServiciosRepository } from "../repositories";
import { Failure, crearFailure } from "@/shared/errors";

export class CambiarEstadoServicioUseCase {
  constructor(private repository: IServiciosRepository) {}

  async execute(
    id: string,
    activo: boolean
  ): Promise<{ failure?: Failure }> {
    if (!id || !id.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El identificador del servicio es requerido."
        ),
      };
    }

    return this.repository.cambiarEstadoServicio(id.trim(), activo);
  }
}
