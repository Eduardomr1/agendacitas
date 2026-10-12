import { describe, it, expect, vi } from "vitest";
import { GenerarSlotsDisponiblesUseCase } from "./GenerarSlotsDisponiblesUseCase";
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

    const resIndefinida = await useCase.execute({
      horarioAtencion: horarioValido,
    } as any);
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

  it("retorna failure DATOS_INVALIDOS si pasoMin es menor o igual a cero", async () => {
    const useCase = new GenerarSlotsDisponiblesUseCase();

    const resultado = await useCase.execute({
      horarioAtencion: horarioValido,
      duracionServicioMin: 30,
      pasoMin: -5,
    });

    expect(resultado.failure).toBeDefined();
    expect(resultado.failure?.tipo).toBe("DATOS_INVALIDOS");
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
    // 09:00 (duración 60m + 15m buffer = hasta 10:15, choca con cita de las 10:00) -> bloqueado
    expect(resultado.data).not.toContain("09:00");
    expect(resultado.data).not.toContain("10:00");
    // Cita 10:00-11:00 con 15m buffer termina 11:15
    expect(resultado.data).not.toContain("11:00");
    // 11:30 a 12:30 -> disponible
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
