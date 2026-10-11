import { INegocioRepository } from "../repositories";
import { ActualizarNegocioInput, NegocioConfig } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ActualizarNegocioUseCase {
  constructor(private repository: INegocioRepository) {}

  async execute(
    ownerId: string,
    input: ActualizarNegocioInput
  ): Promise<{ data?: NegocioConfig; failure?: Failure }> {
    if (!ownerId || !ownerId.trim()) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El ID de propietario es requerido."
        ),
      };
    }

    const nombreLimpio = input.nombre.trim();
    if (!nombreLimpio) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El nombre del negocio no puede estar vacío."
        ),
      };
    }

    if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El nombre del negocio debe tener entre 2 y 80 caracteres."
        ),
      };
    }

    const slugLimpio = input.slug.trim().toLowerCase();
    if (!slugLimpio) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El enlace público (slug) no puede estar vacío."
        ),
      };
    }

    if (slugLimpio.length < 3 || slugLimpio.length > 50 || !SLUG_REGEX.test(slugLimpio)) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "El slug debe tener entre 3 y 50 caracteres alfanuméricos en minúsculas y guiones (ej. 'mi-estudio')."
        ),
      };
    }

    const zonaLimpia = input.zonaHoraria.trim();
    if (!zonaLimpia) {
      return {
        failure: crearFailure(
          "DATOS_INVALIDOS",
          "La zona horaria es requerida."
        ),
      };
    }

    return this.repository.crearOActualizar(ownerId.trim(), {
      nombre: nombreLimpio,
      slug: slugLimpio,
      zonaHoraria: zonaLimpia,
    });
  }
}
