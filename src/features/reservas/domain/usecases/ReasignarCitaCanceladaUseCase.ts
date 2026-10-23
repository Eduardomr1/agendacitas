/**
 * Caso de uso: Reasignar Cita Cancelada con Candidatos de Lista de Espera.
 *
 * Cuando una cita es cancelada o liberada, evalúa inmediatamente el hueco resultante
 * y empareja con la lista de espera determinística, notificando o reasignando
 * automáticamente al mejor candidato según antigüedad y prioridad.
 */

import { crearFailure, type Failure } from "@/shared/errors";
import type { CitaResultado, CitaSolicitud } from "../entities";
import {
  seleccionarCandidatosListaEspera,
  type CandidatoListaEsperaEvaluado,
  type EntradaListaEspera,
  type EstadoEntradaListaEspera,
  type HuecoLiberado,
} from "../listaEspera";

export interface IListaEsperaPort {
  obtenerEntradasActivas(negocioId: string, fecha: string): Promise<EntradaListaEspera[]>;
  actualizarEstadoEntrada(id: string, estado: EstadoEntradaListaEspera): Promise<void>;
}

export interface ICitaCancelable {
  id: string;
  negocioId: string;
  servicioId: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  clienteEmail: string;
  clienteNombre: string;
  estado: string;
}

export interface ICitasPort {
  obtenerCitaPorId(id: string): Promise<ICitaCancelable | null>;
  marcarCitaCancelada(id: string, motivo?: string): Promise<{ ok: boolean; error?: string }>;
  crearCita(solicitud: CitaSolicitud): Promise<{ data?: CitaResultado; failure?: Failure }>;
}

export interface ReasignarCitaCanceladaInput {
  citaId: string;
  negocioId: string;
  motivoCancelacion?: string;
  autoReasignarPrimerCandidato?: boolean;
  limiteNotificados?: number;
  ahoraReferencia?: Date;
}

export interface ReasignarCitaCanceladaOutput {
  citaOriginalId: string;
  huecoLiberado: HuecoLiberado;
  candidatosDisponibles: CandidatoListaEsperaEvaluado[];
  candidatoReasignado?: CandidatoListaEsperaEvaluado;
  nuevaCitaCreada?: CitaResultado;
  totalNotificados: number;
}

export class ReasignarCitaCanceladaUseCase {
  constructor(
    private readonly citasPort: ICitasPort,
    private readonly listaEsperaPort: IListaEsperaPort,
  ) {}

  async execute(
    input: ReasignarCitaCanceladaInput,
  ): Promise<{ data?: ReasignarCitaCanceladaOutput; failure?: Failure }> {
    if (!input.citaId || !input.citaId.trim()) {
      return { failure: crearFailure("DATOS_INVALIDOS", "El identificador de la cita es obligatorio.") };
    }

    if (!input.negocioId || !input.negocioId.trim()) {
      return { failure: crearFailure("DATOS_INVALIDOS", "El identificador del negocio es obligatorio.") };
    }

    const cita = await this.citasPort.obtenerCitaPorId(input.citaId);
    if (!cita) {
      return { failure: crearFailure("RECURSO_NO_ENCONTRADO", `No se encontró la cita con ID "${input.citaId}".`) };
    }

    if (cita.negocioId !== input.negocioId) {
      return { failure: crearFailure("NO_AUTORIZADO", "La cita no pertenece al negocio indicado.") };
    }

    if (cita.estado === "cancelada") {
      return { failure: crearFailure("DATOS_INVALIDOS", "La cita ya se encuentra previamente cancelada.") };
    }

    const cancelResult = await this.citasPort.marcarCitaCancelada(cita.id, input.motivoCancelacion);
    if (!cancelResult.ok) {
      return { failure: crearFailure("DESCONOCIDO", cancelResult.error ?? "No se pudo cancelar la cita.") };
    }

    const hueco: HuecoLiberado = {
      negocioId: cita.negocioId,
      servicioId: cita.servicioId,
      fecha: cita.fecha,
      horaInicio: cita.horaInicio,
      horaFin: cita.horaFin,
    };

    const entradasActivas = await this.listaEsperaPort.obtenerEntradasActivas(cita.negocioId, cita.fecha);

    const candidatos = seleccionarCandidatosListaEspera(hueco, entradasActivas, {
      limiteCandidatos: input.limiteNotificados ?? 5,
      ahoraReferencia: input.ahoraReferencia,
    });

    if (candidatos.length === 0) {
      return {
        data: {
          citaOriginalId: cita.id,
          huecoLiberado: hueco,
          candidatosDisponibles: [],
          totalNotificados: 0,
        },
      };
    }

    // Flujo de auto-reasignación directa
    if (input.autoReasignarPrimerCandidato) {
      const mejorCandidato = candidatos[0];
      if (mejorCandidato) {
        const [anio, mes, dia] = cita.fecha.split("-").map(Number);
        const [iniH, iniM] = mejorCandidato.horaInicioSugerida.split(":").map(Number);
        const [finH, finM] = mejorCandidato.horaFinSugerida.split(":").map(Number);

        const fechaInicio = new Date(Date.UTC(anio ?? 2026, (mes ?? 1) - 1, dia ?? 1, iniH ?? 0, iniM ?? 0));
        const fechaFin = new Date(Date.UTC(anio ?? 2026, (mes ?? 1) - 1, dia ?? 1, finH ?? 0, finM ?? 0));

        const solicitud: CitaSolicitud = {
          negocioId: cita.negocioId,
          servicioId: mejorCandidato.entrada.servicioId,
          clienteNombre: mejorCandidato.entrada.clienteNombre,
          clienteEmail: mejorCandidato.entrada.clienteEmail,
          clienteTelefono: mejorCandidato.entrada.clienteTelefono,
          inicio: fechaInicio,
          fin: fechaFin,
        };

        const resCita = await this.citasPort.crearCita(solicitud);
        if (resCita.failure || !resCita.data) {
          return { failure: resCita.failure ?? crearFailure("DESCONOCIDO", "Error al crear cita reasignada.") };
        }

        await this.listaEsperaPort.actualizarEstadoEntrada(mejorCandidato.entrada.id, "convertida");

        return {
          data: {
            citaOriginalId: cita.id,
            huecoLiberado: hueco,
            candidatosDisponibles: candidatos,
            candidatoReasignado: mejorCandidato,
            nuevaCitaCreada: resCita.data,
            totalNotificados: 1,
          },
        };
      }
    }

    // Flujo de notificación a candidatos para postulación
    for (const candidato of candidatos) {
      await this.listaEsperaPort.actualizarEstadoEntrada(candidato.entrada.id, "notificada");
    }

    return {
      data: {
        citaOriginalId: cita.id,
        huecoLiberado: hueco,
        candidatosDisponibles: candidatos,
        totalNotificados: candidatos.length,
      },
    };
  }
}
