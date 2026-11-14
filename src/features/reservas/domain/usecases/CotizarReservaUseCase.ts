import {
  MotorTarificadorReservas,
  type CuponPromocional,
  type ItemServicioCotizable,
  type PoliticaAnticipoConfig,
  type ReglaTarifaDinamica,
  type ResultadoCotizacionReserva,
} from "../tarificadorReservas";

export interface CotizarReservaCommand {
  readonly negocioId: string;
  readonly servicios: readonly ItemServicioCotizable[];
  readonly fechaCita: Date;
  readonly fechaCotizacion?: Date;
  readonly horaInicio: string;
  readonly ocupacionDiaPorc?: number;
  readonly historialNoShowsCliente?: number;
  readonly reglasDinamicas?: readonly ReglaTarifaDinamica[];
  readonly cupon?: CuponPromocional;
  readonly politicaAnticipo?: PoliticaAnticipoConfig;
}

/**
 * Caso de Uso de Dominio encargado de validar los invariantes de entrada y
 * calcular la cotización final multi-servicio, descuentos y anticipo de una reserva.
 */
export class CotizarReservaUseCase {
  public execute(command: CotizarReservaCommand): ResultadoCotizacionReserva {
    if (!command.negocioId || command.negocioId.trim().length === 0) {
      throw new Error("El negocioId es obligatorio para cotizar la reserva.");
    }

    if (!command.servicios || command.servicios.length === 0) {
      throw new Error("Debe incluir al menos un servicio para generar la cotización.");
    }

    if (!/^\d{2}:\d{2}$/.test(command.horaInicio)) {
      throw new Error("La hora de inicio debe tener formato HH:MM.");
    }

    const fechaCitaMs = command.fechaCita.getTime();
    if (!Number.isFinite(fechaCitaMs)) {
      throw new Error("La fecha de la cita debe ser una fecha válida.");
    }

    const fechaCotizacion = command.fechaCotizacion ?? new Date();
    if (!Number.isFinite(fechaCotizacion.getTime())) {
      throw new Error("La fecha de cotización debe ser válida.");
    }

    return MotorTarificadorReservas.cotizar({
      servicios: command.servicios,
      fechaCita: command.fechaCita,
      fechaCotizacion,
      horaInicio: command.horaInicio,
      ocupacionDiaPorc: command.ocupacionDiaPorc,
      historialNoShowsCliente: command.historialNoShowsCliente,
      reglasDinamicas: command.reglasDinamicas,
      cupon: command.cupon,
      politicaAnticipo: command.politicaAnticipo,
    });
  }
}
