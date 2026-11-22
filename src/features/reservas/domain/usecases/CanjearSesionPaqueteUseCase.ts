import {
  calcularResumenBilleteraCliente,
  calcularValorReembolsoProrrateado,
  conciliarPaqueteConLibro,
  ejecutarCanjeSesion,
  revertirCanjeSesion,
  seleccionarMejorPaqueteParaReserva,
  type MotivoRechazoCanjePaquete,
  type MovimientoCreditoPaquete,
  type PaqueteSesionesCliente,
  type ResultadoElegibilidadCanje,
  type ResultadoReembolsoProrrateado,
  type ResultadoReversionCanje,
  type ResumenBilleteraCliente,
} from "../paquetesSesiones";

export interface CanjearSesionPaqueteCommand {
  readonly negocioId: string;
  readonly clienteId: string;
  readonly servicioId: string;
  readonly citaId: string;
  readonly paquetesCliente: readonly PaqueteSesionesCliente[];
  readonly paqueteId?: string;
  readonly sesionesARedimir?: number;
  readonly ahora?: Date;
  readonly movimientoId?: string;
  readonly citasYaCanjeadasIds?: readonly string[];
  readonly movimientosLibro?: readonly MovimientoCreditoPaquete[];
}

export type MotivoRechazoCanjeUseCase =
  | MotivoRechazoCanjePaquete
  | "SIN_PAQUETES_DISPONIBLES"
  | "PAQUETE_NO_ENCONTRADO"
  | "LIBRO_DESINCRONIZADO";

export interface ResultadoCanjearSesionPaqueteUseCase {
  readonly canjeado: boolean;
  readonly seleccionAutomatica: boolean;
  readonly paqueteId: string | null;
  readonly paqueteActualizado: PaqueteSesionesCliente | null;
  readonly movimientoGenerado: MovimientoCreditoPaquete | null;
  readonly elegibilidad: ResultadoElegibilidadCanje | null;
  readonly sesionesCanjeadas: number;
  readonly sesionesRestantesEnPaquete: number;
  readonly valorCanjeadoCentavos: number;
  readonly resumenBilleteraActualizado: ResumenBilleteraCliente;
  readonly motivoRechazo?: MotivoRechazoCanjeUseCase;
  readonly detalle?: string;
}

export interface RevertirCanjePaqueteCommand {
  readonly negocioId: string;
  readonly paquete: PaqueteSesionesCliente;
  readonly citaId: string;
  readonly sesionesARevertir?: number;
  readonly ahora?: Date;
  readonly movimientoId?: string;
  readonly servicioId?: string;
}

export interface CalcularReembolsoPaqueteCommand {
  readonly negocioId: string;
  readonly paquete: PaqueteSesionesCliente;
  readonly ahora?: Date;
  readonly porcentajePenalizacion?: number;
  readonly cargoAdministrativoCentavos?: number;
  readonly permitirReembolsoSiExpirado?: boolean;
}

function obtenerCitasYaCanjeadasActivas(
  citasExplicitas: readonly string[] | undefined,
  movimientosLibro: readonly MovimientoCreditoPaquete[] | undefined
): string[] {
  const conteoPorCita = new Map<string, number>();

  for (const mov of movimientosLibro ?? []) {
    if (!mov.citaId) continue;
    const citaId = mov.citaId.trim();
    if (!citaId) continue;
    if (mov.tipo === "CANJE") {
      conteoPorCita.set(citaId, (conteoPorCita.get(citaId) ?? 0) + 1);
    } else if (mov.tipo === "REVERSION_CANJE") {
      conteoPorCita.set(citaId, (conteoPorCita.get(citaId) ?? 0) - 1);
    }
  }

  const citasBloqueadas = new Set(
    (citasExplicitas ?? []).map((id) => id.trim()).filter(Boolean)
  );
  for (const [citaId, balance] of conteoPorCita.entries()) {
    if (balance > 0) {
      citasBloqueadas.add(citaId);
    }
  }

  return Array.from(citasBloqueadas);
}

/**
 * Caso de Uso de Dominio para el canje determinístico de sesiones prepagadas
 * (selección explícita o automática FEFO/FIFO), conciliación del libro de
 * créditos, reversión por cancelación y cálculo de reembolso prorrateado.
 */
export class CanjearSesionPaqueteUseCase {
  public execute(
    command: CanjearSesionPaqueteCommand
  ): ResultadoCanjearSesionPaqueteUseCase {
    if (!command.negocioId || command.negocioId.trim().length === 0) {
      throw new Error("El negocioId es obligatorio para canjear una sesión.");
    }
    if (!command.clienteId || command.clienteId.trim().length === 0) {
      throw new Error("El clienteId es obligatorio para canjear una sesión.");
    }
    if (!command.servicioId || command.servicioId.trim().length === 0) {
      throw new Error("El servicioId es obligatorio para canjear una sesión.");
    }
    if (!command.citaId || command.citaId.trim().length === 0) {
      throw new Error("El citaId es obligatorio para canjear una sesión.");
    }

    const ahora = command.ahora ?? new Date();
    if (!(ahora instanceof Date) || !Number.isFinite(ahora.getTime())) {
      throw new Error("La fecha de referencia 'ahora' debe ser válida.");
    }

    const sesionesARedimir = command.sesionesARedimir ?? 1;
    if (!Number.isInteger(sesionesARedimir) || sesionesARedimir <= 0) {
      throw new Error(
        "La cantidad sesionesARedimir debe ser un entero positivo mayor a 0."
      );
    }

    const citasYaCanjeadasIds = obtenerCitasYaCanjeadasActivas(
      command.citasYaCanjeadasIds,
      command.movimientosLibro
    );
    const resumenInicial = calcularResumenBilleteraCliente(
      command.paquetesCliente,
      ahora,
      command.clienteId.trim()
    );

    const seleccionAutomatica = !command.paqueteId;
    let paqueteObjetivo: PaqueteSesionesCliente | null = null;

    if (command.paqueteId) {
      const encontrado = command.paquetesCliente.find(
        (p) => p.id === command.paqueteId
      );
      if (!encontrado) {
        return {
          canjeado: false,
          seleccionAutomatica: false,
          paqueteId: command.paqueteId,
          paqueteActualizado: null,
          movimientoGenerado: null,
          elegibilidad: null,
          sesionesCanjeadas: 0,
          sesionesRestantesEnPaquete: 0,
          valorCanjeadoCentavos: 0,
          resumenBilleteraActualizado: resumenInicial,
          motivoRechazo: "PAQUETE_NO_ENCONTRADO",
          detalle: `No se encontró el paquete "${command.paqueteId}" en la billetera del cliente.`,
        };
      }
      paqueteObjetivo = encontrado;
    } else {
      const seleccion = seleccionarMejorPaqueteParaReserva({
        paquetes: command.paquetesCliente,
        servicioId: command.servicioId,
        ahora,
        clienteId: command.clienteId,
        negocioId: command.negocioId,
        sesionesRequeridas: sesionesARedimir,
        citaId: command.citaId,
        citasYaCanjeadasIds,
      });

      if (!seleccion.seleccionado || !seleccion.paqueteSeleccionado) {
        return {
          canjeado: false,
          seleccionAutomatica: true,
          paqueteId: null,
          paqueteActualizado: null,
          movimientoGenerado: null,
          elegibilidad: null,
          sesionesCanjeadas: 0,
          sesionesRestantesEnPaquete: 0,
          valorCanjeadoCentavos: 0,
          resumenBilleteraActualizado: resumenInicial,
          motivoRechazo:
            seleccion.motivoSinPaquete ?? "SIN_PAQUETES_DISPONIBLES",
          detalle:
            seleccion.paquetesDescartados[0]?.detalle ??
            "El cliente no dispone de paquetes elegibles para este servicio.",
        };
      }
      paqueteObjetivo = seleccion.paqueteSeleccionado;
    }

    if (command.movimientosLibro) {
      const movimientosDelPaquete = command.movimientosLibro.filter(
        (m) => m.paqueteId === paqueteObjetivo.id
      );
      if (movimientosDelPaquete.length > 0) {
        const conciliacion = conciliarPaqueteConLibro(
          paqueteObjetivo,
          movimientosDelPaquete
        );
        if (!conciliacion.conciliado) {
          return {
            canjeado: false,
            seleccionAutomatica,
            paqueteId: paqueteObjetivo.id,
            paqueteActualizado: null,
            movimientoGenerado: null,
            elegibilidad: null,
            sesionesCanjeadas: 0,
            sesionesRestantesEnPaquete: 0,
            valorCanjeadoCentavos: 0,
            resumenBilleteraActualizado: resumenInicial,
            motivoRechazo: "LIBRO_DESINCRONIZADO",
            detalle: conciliacion.discrepancias.join(" "),
          };
        }
      }
    }

    const resultadoCanje = ejecutarCanjeSesion({
      paquete: paqueteObjetivo,
      servicioId: command.servicioId,
      citaId: command.citaId,
      ahora,
      movimientoId: command.movimientoId,
      clienteId: command.clienteId,
      negocioId: command.negocioId,
      sesionesARedimir,
      citasYaCanjeadasIds,
    });

    if (!resultadoCanje.exito || !resultadoCanje.paqueteActualizado) {
      return {
        canjeado: false,
        seleccionAutomatica,
        paqueteId: paqueteObjetivo.id,
        paqueteActualizado: null,
        movimientoGenerado: null,
        elegibilidad: resultadoCanje.elegibilidad,
        sesionesCanjeadas: 0,
        sesionesRestantesEnPaquete:
          resultadoCanje.elegibilidad.sesionesDisponibles,
        valorCanjeadoCentavos: 0,
        resumenBilleteraActualizado: resumenInicial,
        motivoRechazo: resultadoCanje.motivoRechazo,
        detalle: resultadoCanje.detalle,
      };
    }

    const paquetesActualizados = command.paquetesCliente.map((p) =>
      p.id === resultadoCanje.paqueteActualizado!.id
        ? resultadoCanje.paqueteActualizado!
        : p
    );

    const resumenBilleteraActualizado = calcularResumenBilleteraCliente(
      paquetesActualizados,
      ahora,
      command.clienteId.trim()
    );

    return {
      canjeado: true,
      seleccionAutomatica,
      paqueteId: resultadoCanje.paqueteActualizado.id,
      paqueteActualizado: resultadoCanje.paqueteActualizado,
      movimientoGenerado: resultadoCanje.movimientoGenerado,
      elegibilidad: resultadoCanje.elegibilidad,
      sesionesCanjeadas: sesionesARedimir,
      sesionesRestantesEnPaquete:
        resultadoCanje.elegibilidad.sesionesRestantesDespues,
      valorCanjeadoCentavos: resultadoCanje.elegibilidad.valorCanjeCentavos,
      resumenBilleteraActualizado,
    };
  }

  public revertirCanje(
    command: RevertirCanjePaqueteCommand
  ): ResultadoReversionCanje {
    if (!command.negocioId || command.negocioId.trim().length === 0) {
      throw new Error("El negocioId es obligatorio para revertir un canje.");
    }
    if (command.paquete.negocioId.trim() !== command.negocioId.trim()) {
      throw new Error("El paquete no pertenece al negocio indicado.");
    }
    if (!command.citaId || command.citaId.trim().length === 0) {
      throw new Error("El citaId es obligatorio para revertir un canje.");
    }

    const ahora = command.ahora ?? new Date();
    if (!(ahora instanceof Date) || !Number.isFinite(ahora.getTime())) {
      throw new Error("La fecha de referencia 'ahora' debe ser válida.");
    }

    return revertirCanjeSesion({
      paquete: command.paquete,
      citaId: command.citaId,
      ahora,
      sesionesARevertir: command.sesionesARevertir,
      movimientoId: command.movimientoId,
      servicioId: command.servicioId,
    });
  }

  public calcularReembolsoProrrateado(
    command: CalcularReembolsoPaqueteCommand
  ): ResultadoReembolsoProrrateado {
    if (!command.negocioId || command.negocioId.trim().length === 0) {
      throw new Error("El negocioId es obligatorio para calcular reembolso.");
    }
    if (command.paquete.negocioId.trim() !== command.negocioId.trim()) {
      throw new Error("El paquete no pertenece al negocio indicado.");
    }

    const ahora = command.ahora ?? new Date();
    if (!(ahora instanceof Date) || !Number.isFinite(ahora.getTime())) {
      throw new Error("La fecha de referencia 'ahora' debe ser válida.");
    }

    return calcularValorReembolsoProrrateado({
      paquete: command.paquete,
      ahora,
      porcentajePenalizacion: command.porcentajePenalizacion,
      cargoAdministrativoCentavos: command.cargoAdministrativoCentavos,
      permitirReembolsoSiExpirado: command.permitirReembolsoSiExpirado,
    });
  }
}
