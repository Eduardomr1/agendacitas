import { describe, expect, it } from "vitest";
import {
  ReasignarCitaCanceladaUseCase,
  type ICitaCancelable,
  type ICitasPort,
  type IListaEsperaPort,
} from "./ReasignarCitaCanceladaUseCase";
import type { EntradaListaEspera, EstadoEntradaListaEspera } from "../listaEspera";
import type { CitaResultado, CitaSolicitud } from "../entities";
import type { Failure } from "@/shared/errors";

describe("ReasignarCitaCanceladaUseCase", () => {
  const dummyCita: ICitaCancelable = {
    id: "cita-100",
    negocioId: "negocio-spa",
    servicioId: "masaje-relajante",
    fecha: "2026-11-20",
    horaInicio: "15:00",
    horaFin: "16:00",
    clienteEmail: "original@example.com",
    clienteNombre: "Cliente Original",
    estado: "confirmada",
  };

  const dummyEntradaEspera: EntradaListaEspera = {
    id: "espera-50",
    negocioId: "negocio-spa",
    servicioId: "masaje-relajante",
    clienteNombre: "Lucia Santos",
    clienteEmail: "lucia@example.com",
    clienteTelefono: "555-1234",
    fechaDeseada: "2026-11-20",
    franjaPreferida: "tarde",
    duracionRequeridaMin: 60,
    prioridadManual: 2,
    creadaEn: new Date("2026-11-10T10:00:00Z"),
    estado: "activa",
  };

  function crearMocks(overrides?: {
    cita?: ICitaCancelable | null;
    entradas?: EntradaListaEspera[];
  }) {
    const estadoCita: ICitaCancelable | null =
      overrides?.cita !== undefined ? overrides.cita : { ...dummyCita };
    const listaEntradas = overrides?.entradas ?? [dummyEntradaEspera];
    const estadosEntradas = new Map<string, EstadoEntradaListaEspera>();

    const citasPort: ICitasPort = {
      async obtenerCitaPorId(id: string) {
        if (!estadoCita || estadoCita.id !== id) return null;
        return estadoCita;
      },
      async marcarCitaCancelada(id: string) {
        if (estadoCita && estadoCita.id === id) {
          estadoCita.estado = "cancelada";
          return { ok: true };
        }
        return { ok: false, error: "Cita no encontrada" };
      },
      async crearCita(solicitud: CitaSolicitud): Promise<{ data?: CitaResultado; failure?: Failure }> {
        return {
          data: {
            id: "cita-reasignada-200",
            inicio: solicitud.inicio,
            fin: solicitud.fin,
            clienteNombre: solicitud.clienteNombre,
            clienteEmail: solicitud.clienteEmail,
            estado: "confirmada",
          },
        };
      },
    };

    const listaEsperaPort: IListaEsperaPort = {
      async obtenerEntradasActivas(negocioId: string, fecha: string) {
        return listaEntradas.filter(
          (e) => e.negocioId === negocioId && e.fechaDeseada === fecha && e.estado === "activa"
        );
      },
      async actualizarEstadoEntrada(id: string, estado: EstadoEntradaListaEspera) {
        estadosEntradas.set(id, estado);
      },
    };

    return { citasPort, listaEsperaPort, estadosEntradas };
  }

  it("reasigna y convierte automaticamente al mejor candidato de lista de espera", async () => {
    const { citasPort, listaEsperaPort, estadosEntradas } = crearMocks();
    const useCase = new ReasignarCitaCanceladaUseCase(citasPort, listaEsperaPort);

    const result = await useCase.execute({
      citaId: "cita-100",
      negocioId: "negocio-spa",
      autoReasignarPrimerCandidato: true,
    });

    expect(result.failure).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.citaOriginalId).toBe("cita-100");
    expect(result.data?.candidatoReasignado?.entrada.id).toBe("espera-50");
    expect(result.data?.nuevaCitaCreada?.id).toBe("cita-reasignada-200");
    expect(estadosEntradas.get("espera-50")).toBe("convertida");
  });

  it("notifica a candidatos sin auto-asignar cuando autoReasignarPrimerCandidato es falso", async () => {
    const { citasPort, listaEsperaPort, estadosEntradas } = crearMocks();
    const useCase = new ReasignarCitaCanceladaUseCase(citasPort, listaEsperaPort);

    const result = await useCase.execute({
      citaId: "cita-100",
      negocioId: "negocio-spa",
      autoReasignarPrimerCandidato: false,
    });

    expect(result.failure).toBeUndefined();
    expect(result.data?.totalNotificados).toBe(1);
    expect(result.data?.candidatoReasignado).toBeUndefined();
    expect(estadosEntradas.get("espera-50")).toBe("notificada");
  });

  it("cancela la cita exitosamente incluso si no hay candidatos en espera", async () => {
    const { citasPort, listaEsperaPort } = crearMocks({ entradas: [] });
    const useCase = new ReasignarCitaCanceladaUseCase(citasPort, listaEsperaPort);

    const result = await useCase.execute({
      citaId: "cita-100",
      negocioId: "negocio-spa",
    });

    expect(result.failure).toBeUndefined();
    expect(result.data?.candidatosDisponibles).toHaveLength(0);
    expect(result.data?.totalNotificados).toBe(0);
  });

  it("retorna failure si la cita no existe o ya esta cancelada", async () => {
    const { citasPort, listaEsperaPort } = crearMocks({ cita: null });
    const useCase = new ReasignarCitaCanceladaUseCase(citasPort, listaEsperaPort);

    const resNoExiste = await useCase.execute({
      citaId: "cita-inexistente",
      negocioId: "negocio-spa",
    });
    expect(resNoExiste.failure?.tipo).toBe("RECURSO_NO_ENCONTRADO");
  });
});
