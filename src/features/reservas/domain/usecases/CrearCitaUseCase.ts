import { IReservasRepository } from "../repositories";
import { CitaSolicitud, CitaResultado } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

export class CrearCitaUseCase {
  constructor(private repository: IReservasRepository) {}

  async execute(solicitud: CitaSolicitud): Promise<{ data?: CitaResultado; failure?: Failure }> {
    // Validaciones de dominio puras antes de tocar la base de datos
    if (!solicitud.clienteNombre.trim()) {
      return { failure: crearFailure("DATOS_INVALIDOS", "El nombre del cliente es obligatorio.") };
    }

    if (!solicitud.clienteEmail.includes("@")) {
      return { failure: crearFailure("DATOS_INVALIDOS", "Por favor ingresa un correo electrónico válido.") };
    }

    if (solicitud.inicio >= solicitud.fin) {
      return { failure: crearFailure("DATOS_INVALIDOS", "La hora de inicio debe ser anterior a la hora de fin.") };
    }

    return this.repository.crearCita(solicitud);
  }
}
