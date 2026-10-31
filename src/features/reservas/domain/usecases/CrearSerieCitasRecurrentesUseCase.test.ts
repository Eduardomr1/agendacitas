import { describe, expect, it } from "vitest";
import {
  CrearSerieCitasRecurrentesUseCase,
  type CrearSerieCitasRecurrentesInput,
  type ISerieRecurrentePort,
} from "./CrearSerieCitasRecurrentesUseCase";
import type { CitaResultado, CitaSolicitud } from "../entities";
import type { CitaOcupada } from "../motorDisponibilidad";

describe("CrearSerieCitasRecurrentesUseCase", () => {
  const inputBase: CrearSerieCitasRecurrentesInput = {
    negocioId: "negocio-yoga",
    servicioId: "pase-mensual",
    clienteNombre: "Valeria Moran",
    clienteEmail: "valeria@example.com",
    clienteTelefono: "555-9876",
    fechaInicio: "2026-11-03", // Martes
    horaInicio: "18:00",
    horaFin: "19:00",
    frecuencia: "semanal",
    totalOcurrencias: 4,
  };

  function crearMockRepository(overrides?: {
    feriados?: string[];
    citas?: CitaOcupada[];
    simularErrorPersistencia?: boolean;
  }) {
    const persistidas: CitaSolicitud[] = [];

    const port: ISerieRecurrentePort = {
      async obtenerFeriadosYBloqueos() {
        return overrides?.feriados ?? [];
      },
      async obtenerCitasEnRango() {
        return overrides?.citas ?? [];
      },
      async crearSerieTransaccional(solicitudes: CitaSolicitud[]) {
        if (overrides?.simularErrorPersistencia) {
          return {
            failure: {
              tipo: "CONFLICTO_SERIE_RECURRENTE",
              mensajeUsuario: "Error transaccional simulado: rollback ejecutado.",
            },
          };
        }

        persistidas.push(...solicitudes);
        const creadas: CitaResultado[] = solicitudes.map((s, idx) => ({
          id: `cita-serie-${idx + 1}`,
          inicio: s.inicio,
          fin: s.fin,
          clienteNombre: s.clienteNombre,
          clienteEmail: s.clienteEmail,
          estado: "confirmada",
        }));

        return { data: creadas };
      },
    };

    return { port, persistidas };
  }

  it("crea exitosamente una serie recurrente completa de 4 semanas", async () => {
    const { port, persistidas } = crearMockRepository();
    const useCase = new CrearSerieCitasRecurrentesUseCase(port);

    const result = await useCase.execute(inputBase);

    expect(result.failure).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.totalOcurrenciasAgendadas).toBe(4);
    expect(persistidas).toHaveLength(4);
    expect(result.data?.plan.esCompletamenteFactible).toBe(true);
  });

  it("aborta y ejecuta rollback completo cuando hay conflicto parcial con estrategia por defecto", async () => {
    // La 3ra semana (17 Nov) tiene un feriado bloqueado
    const { port, persistidas } = crearMockRepository({
      feriados: ["2026-11-17"],
    });
    const useCase = new CrearSerieCitasRecurrentesUseCase(port);

    const result = await useCase.execute({
      ...inputBase,
      estrategiaConflicto: "abortar_si_hay_conflicto",
    });

    expect(result.data).toBeUndefined();
    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("CONFLICTO_SERIE_RECURRENTE");
    expect(result.failure?.mensajeUsuario).toContain("1 cita(s) presentan conflicto");
    // Ninguna cita fue persistida en base de datos (rollback)
    expect(persistidas).toHaveLength(0);
  });

  it("agenda unicamente las fechas validas cuando la estrategia es saltar_conflictos", async () => {
    // La 2da semana (10 Nov) tiene una cita existente en conflicto
    const citaConflicto: CitaOcupada = {
      id: "cita-ocupada-1",
      inicio: new Date("2026-11-10T18:00:00Z"),
      fin: new Date("2026-11-10T19:00:00Z"),
      estado: "confirmada",
    };

    const { port, persistidas } = crearMockRepository({
      citas: [citaConflicto],
    });
    const useCase = new CrearSerieCitasRecurrentesUseCase(port);

    const result = await useCase.execute({
      ...inputBase,
      estrategiaConflicto: "saltar_conflictos",
    });

    expect(result.failure).toBeUndefined();
    expect(result.data).toBeDefined();
    // De 4 solicitadas, se saltó la 2da y se agendaron 3
    expect(result.data?.totalOcurrenciasAgendadas).toBe(3);
    expect(persistidas).toHaveLength(3);
  });

  it("falla con DATOS_INVALIDOS ante parametros incorrectos", async () => {
    const { port } = crearMockRepository();
    const useCase = new CrearSerieCitasRecurrentesUseCase(port);

    const result = await useCase.execute({
      ...inputBase,
      clienteEmail: "correo-invalido",
    });

    expect(result.data).toBeUndefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
  });
});
