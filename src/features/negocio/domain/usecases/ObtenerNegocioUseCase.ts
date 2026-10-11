import { INegocioRepository } from "../repositories";
import { NegocioConfig } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

export class ObtenerNegocioUseCase {
  constructor(private repository: INegocioRepository) {}

  async execute(
    ownerId: string
  ): Promise<{ data?: NegocioConfig | null; failure?: Failure }> {
    if (!ownerId || !ownerId.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El ID de propietario es requerido."
        ),
      };
    }

    return this.repository.obtenerPorOwner(ownerId.trim());
  }
}
