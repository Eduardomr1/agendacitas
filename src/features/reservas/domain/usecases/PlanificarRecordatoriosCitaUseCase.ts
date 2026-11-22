import {
  MotorRecordatoriosNoShow,
  validarPoliticaRecordatorios,
  type HistorialClienteNoShow,
  type PlanRecordatoriosCita,
  type PoliticaRecordatoriosConfig,
  type PreferenciasNotificacionCliente,
  type ResultadoDespachoRecordatorios,
} from "../recordatoriosNoShow";

export interface PlanificarRecordatoriosCitaCommand {
  readonly negocioId: string;
  readonly citaId: string;
  readonly inicioCita: Date;
  readonly fechaCreacionReserva?: Date;
  readonly ahora?: Date;
  readonly precioTotalCentavos: number;
  readonly anticipoPagadoCentavos?: number;
  readonly confirmadaPorCliente?: boolean;
  readonly historialCliente?: HistorialClienteNoShow;
  readonly preferenciasCliente?: PreferenciasNotificacionCliente;
  readonly offsetMinutosZonaHoraria?: number;
  readonly politica?: PoliticaRecordatoriosConfig;
}

export interface EvaluarDespachoRecordatoriosCommand {
  readonly negocioId: string;
  readonly plan: PlanRecordatoriosCita;
  readonly ahora?: Date;
  readonly estadoCita: string;
  readonly confirmadaPorCliente: boolean;
  readonly idsYaEnviados?: readonly string[];
}

/**
 * Caso de Uso de Dominio encargado de validar los contratos de entrada y
 * orquestar la evaluación de riesgo de inasistencia (no-show), la planificación
 * de recordatorios con horas de silencio y el despacho idempotente de envíos.
 */
export class PlanificarRecordatoriosCitaUseCase {
  public execute(
    command: PlanificarRecordatoriosCitaCommand
  ): PlanRecordatoriosCita {
    if (!command.negocioId || command.negocioId.trim().length === 0) {
      throw new Error(
        "El negocioId es obligatorio para planificar recordatorios."
      );
    }

    if (!command.citaId || command.citaId.trim().length === 0) {
      throw new Error(
        "El citaId es obligatorio para planificar recordatorios."
      );
    }

    if (
      !(command.inicioCita instanceof Date) ||
      !Number.isFinite(command.inicioCita.getTime())
    ) {
      throw new Error("La fecha de inicio de la cita debe ser válida.");
    }

    const ahora = command.ahora ?? new Date();
    if (!(ahora instanceof Date) || !Number.isFinite(ahora.getTime())) {
      throw new Error("La fecha de referencia 'ahora' debe ser válida.");
    }

    const fechaCreacionReserva = command.fechaCreacionReserva ?? ahora;
    if (
      !(fechaCreacionReserva instanceof Date) ||
      !Number.isFinite(fechaCreacionReserva.getTime())
    ) {
      throw new Error("La fecha de creación de la reserva debe ser válida.");
    }

    if (
      !Number.isInteger(command.precioTotalCentavos) ||
      command.precioTotalCentavos < 0
    ) {
      throw new Error(
        "El precio total debe ser un entero mayor o igual a 0 en centavos."
      );
    }

    if (
      command.anticipoPagadoCentavos !== undefined &&
      (!Number.isInteger(command.anticipoPagadoCentavos) ||
        command.anticipoPagadoCentavos < 0 ||
        command.anticipoPagadoCentavos > command.precioTotalCentavos)
    ) {
      throw new Error(
        "El anticipo pagado debe ser un entero en centavos entre 0 y el precio total."
      );
    }

    if (command.politica) {
      const validacion = validarPoliticaRecordatorios(command.politica);
      if (!validacion.valido) {
        throw new Error(validacion.errores.join(" "));
      }
    }

    return MotorRecordatoriosNoShow.planificar({
      citaId: command.citaId,
      inicioCita: command.inicioCita,
      fechaCreacionReserva,
      ahora,
      precioTotalCentavos: command.precioTotalCentavos,
      anticipoPagadoCentavos: command.anticipoPagadoCentavos,
      confirmadaPorCliente: command.confirmadaPorCliente,
      historialCliente: command.historialCliente,
      preferenciasCliente: command.preferenciasCliente,
      offsetMinutosZonaHoraria: command.offsetMinutosZonaHoraria,
      politica: command.politica,
    });
  }

  public evaluarDespacho(
    command: EvaluarDespachoRecordatoriosCommand
  ): ResultadoDespachoRecordatorios {
    if (!command.negocioId || command.negocioId.trim().length === 0) {
      throw new Error(
        "El negocioId es obligatorio para evaluar el despacho de recordatorios."
      );
    }

    if (!command.plan || !command.plan.citaId.trim()) {
      throw new Error(
        "Se requiere un plan de recordatorios válido para evaluar el despacho."
      );
    }

    if (!command.estadoCita || command.estadoCita.trim().length === 0) {
      throw new Error("El estadoCita es obligatorio para evaluar el despacho.");
    }

    const ahora = command.ahora ?? new Date();
    if (!(ahora instanceof Date) || !Number.isFinite(ahora.getTime())) {
      throw new Error("La fecha de evaluación 'ahora' debe ser válida.");
    }

    return MotorRecordatoriosNoShow.evaluarDespacho(command.plan, {
      ahora,
      estadoCita: command.estadoCita,
      confirmadaPorCliente: command.confirmadaPorCliente,
      idsYaEnviados: command.idsYaEnviados,
    });
  }
}
