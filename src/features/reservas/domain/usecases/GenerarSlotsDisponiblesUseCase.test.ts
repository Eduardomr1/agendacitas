import { describe, it, expect, vi } from "vitest";
import {
  GenerarSlotsDisponiblesUseCase,
  GenerarSlotsInput,
} from "./GenerarSlotsDisponiblesUseCase";
import { IReservasRepository } from "../repositories";
import { HorarioAtencionDia, LunchBreak, CitaOcupada } from "../motorDisponibilidad";

describe("GenerarSlotsDisponiblesUseCase", () => {
  const horarioValido: HorarioAtencionDia = {
    abre: "09:00",
    cierra: "13:00",
    activo: true,
  };

  it("calcula slots con éxito a partir de parámetros puros de dominio", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resultado = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      pasoMin: 30,
    });

    expect(resultado.failure).toBeUndefined();
    expect(resultado.data).toBeDefined();
    expect(resultado.data).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
    ]);
  });

  it("retorna failure DATOS_INVALIDOS si la duración del servicio es nula, indefinida o <= 0", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const inputSinDuracion: GenerarSlotsInput = {
      horarioAtencion: horarioValido,
    };
    const resIndefinida = await useCase.execute(inputSinDuracion);
    expect(resIndefinida.failure).toBeDefined();
    expect(resIndefinida.failure?.tipo).toBe("DATOS_INVALIDOS");

    const resCero = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 0,
    });
    expect(resCero.failure).toBeDefined();
    expect(resCero.failure?.tipo).toBe("DATOS_INVALIDOS");

    const resNegativa = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: -15,
    });
    expect(resNegativa.failure).toBeDefined();
    expect(resNegativa.failure?.tipo).toBe("DATOS_INVALIDOS");
  });

  it("retorna failure DATOS_INVALIDOS si pasoMin, buffers o anticipacionMinimaMin son inválidos", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resPaso = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      pasoMin: -5,
    });
    expect(resPaso.failure?.tipo).toBe("DATOS_INVALIDOS");

    const resBufferNegativo = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      bufferPreparacionMin: { antesMin: -10, despuesMin: 5 },
    });
    expect(resBufferNegativo.failure?.tipo).toBe("DATOS_INVALIDOS");

    const resAnticipacionNegativa = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      anticipacionMinimaMin: -30,
    });
    expect(resAnticipacionNegativa.failure?.tipo).toBe("DATOS_INVALIDOS");

    const resCupoInvalido = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      maxCitasDia: 0,
    });
    expect(resCupoInvalido.failure?.tipo).toBe("DATOS_INVALIDOS");
  });

  it("retorna lista vacía { data: [] } si el día está cerrado o no hay horario de atención", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resSinHorario = await useCase.execute({
      horarioAtencion: null,
      duracionServicioMin: 30,
    });
    expect(resSinHorario.failure).toBeUndefined();
    expect(resSinHorario.data).toEqual([]);

    const resInactivo = await useCase.execute({
      horarioAtencion: { abre: "09:00", cierra: "18:00", activo: false },
      duracionServicioMin: 30,
    });
    expect(resInactivo.failure).toBeUndefined();
    expect(resInactivo.data).toEqual([]);
  });

  it("maneja excepciones de feriado con FECHA_BLOQUEADA cuando retornarFailureEnBloqueo es true", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resConFailure = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      excepcionFecha: {
        cerradoCompleto: true,
        motivo: "Navidad",
      },
      retornarFailureEnBloqueo: true,
    });

    expect(resConFailure.failure?.tipo).toBe("FECHA_BLOQUEADA");
    expect(resConFailure.failure?.mensajeUsuario).toContain("Navidad");

    const resSilencioso = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      excepcionFecha: {
        cerradoCompleto: true,
        motivo: "Navidad",
      },
    });
    expect(resSilencioso.failure).toBeUndefined();
    expect(resSilencioso.data).toEqual([]);
  });

  it("aplica horario especial en día cerrado y ventana de anticipación mínima", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resultado = await useCase.execute({
      horarioAtencion: { abre: "09:00", cierra: "14:00", activo: false },
      duracionServicioMin: 60,
      pasoMin: 60,
      excepcionFecha: {
        abreEspecial: "10:00",
        cierraEspecial: "14:00",
        motivo: "Domingo especial",
      },
      fechaObjetivo: "2026-10-25",
      ahoraReferencia: new Date("2026-10-25T10:15:00Z"),
      anticipacionMinimaMin: 45,
    });

    expect(resultado.failure).toBeUndefined();
    // 10:00 ya pasó (10:15 + 45m = desde 11:00 en adelante)
    expect(resultado.data).toEqual(["11:00", "12:00", "13:00"]);
  });

  it("filtra colisiones con descanso (lunch break) y citas existentes", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const lunch: LunchBreak = { inicio: "11:00", fin: "12:00" };
    const citas: CitaOcupada[] = [{ inicio: "09:30", fin: "10:00" }];

    const resultado = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      lunchBreak: lunch,
      citasExistentes: citas,
      pasoMin: 30,
    });

    expect(resultado.data).toContain("09:00");
    expect(resultado.data).not.toContain("09:30"); // Ocupado por cita
    expect(resultado.data).toContain("10:00");
    expect(resultado.data).toContain("10:30");
    expect(resultado.data).not.toContain("11:00"); // Lunch
    expect(resultado.data).not.toContain("11:30"); // Lunch
    expect(resultado.data).toContain("12:00");
    expect(resultado.data).toContain("12:30");
  });

  it("soporta aliases de parámetros (intervaloServicioMin, horarioLaboral, bufferMin, citas)", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resultado = await useCase.execute({
      horarioLaboral: horarioValido,
      intervaloServicioMin: 60,
      bufferMin: 15,
      citas: [{ inicio: "10:00", fin: "11:00" }],
      pasoMin: 30,
    });

    expect(resultado.failure).toBeUndefined();
    expect(resultado.data).toBeDefined();
    expect(resultado.data).not.toContain("09:00");
    expect(resultado.data).not.toContain("10:00");
    expect(resultado.data).not.toContain("11:00");
    expect(resultado.data).toContain("11:30");
  });

  describe("Delegación en repositorio IReservasRepository", () => {
    it("delega la obtención de slots en el repositorio si se proveen negocioId, fecha y servicioId", async () => {
      const mockRepo: IReservasRepository = {
        obtenerNegocioPorSlug: vi.fn(),
        obtenerServiciosActivos: vi.fn(),
        obtenerSlotsDisponibles: vi.fn().mockResolvedValue({
          data: ["10:00", "10:30", "11:00"],
        }),
        crearCita: vi.fn(),
      };

      const useCase = new GenerarSlotsDisponiblesUseCase(mockRepo);

      const resultado = await useCase.execute({
        negocioId: "neg-123",
        fecha: "2026-10-15",
        servicioId: "srv-456",
      });

      expect(mockRepo.obtenerSlotsDisponibles).toHaveBeenCalledWith(
        "neg-123",
        "2026-10-15",
        "srv-456"
      );
      expect(resultado.data).toEqual(["10:00", "10:30", "11:00"]);
    });

    it("propaga el failure del repositorio si la consulta delegada falla", async () => {
      const mockRepo: IReservasRepository = {
        obtenerNegocioPorSlug: vi.fn(),
        obtenerServiciosActivos: vi.fn(),
        obtenerSlotsDisponibles: vi.fn().mockResolvedValue({
          failure: {
            tipo: "RECURSO_NO_ENCONTRADO",
            mensajeUsuario: "Servicio no encontrado",
          },
        }),
        crearCita: vi.fn(),
      };

      const useCase = new GenerarSlotsDisponiblesUseCase(mockRepo);

      const resultado = await useCase.execute({
        negocioId: "neg-123",
        fecha: "2026-10-15",
        servicioId: "srv-inexistente",
      });

      expect(resultado.failure).toBeDefined();
      expect(resultado.failure?.tipo).toBe("RECURSO_NO_ENCONTRADO");
      expect(resultado.data).toBeUndefined();
    });
  });
});
