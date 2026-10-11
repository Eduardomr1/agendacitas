import { IServiciosRepository } from "../repositories";
import { Failure, crearFailure } from "@/shared/errors";

export class EliminarServicioUseCase {
  constructor(private repository: IServiciosRepository) {}

  async execute(id: string): Promise<{ failure?: Failure }> {
    if (!id || !id.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El identificador del servicio a eliminar es requerido."
        ),
      };
    }

    return this.repository.eliminarServicio(id.trim());
  }
}
