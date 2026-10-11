import { ICitasAdminRepository } from "../repositories";
import { CitaAdminItem, FiltroCitasInput } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

export class ListarCitasAdminUseCase {
  constructor(private repository: ICitasAdminRepository) {}

  async execute(
    filtro: FiltroCitasInput
  ): Promise<{ data?: CitaAdminItem[]; failure?: Failure }> {
    if (!filtro.negocioId || !filtro.negocioId.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El identificador del negocio es requerido."
        ),
      };
    }

    if (filtro.fechaInicio && filtro.fechaFin) {
      if (filtro.fechaInicio.getTime() > filtro.fechaFin.getTime()) {
        return {
          failure: crearFailure(
            "DATOS_INVALIDOS",
            "La fecha de inicio no puede ser posterior a la fecha de fin."
          ),
        };
      }
    }

    return this.repository.listarCitas({
      ...filtro,
      negocioId: filtro.negocioId.trim(),
    });
  }
}
