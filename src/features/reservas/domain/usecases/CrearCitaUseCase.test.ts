import { describe, it, expect, vi } from "vitest";
import { CrearCitaUseCase } from "./CrearCitaUseCase";
import { IReservasRepository } from "../repositories";

describe("CrearCitaUseCase (Dominio)", () => {
  const mockRepo: IReservasRepository = {
    obtenerNegocioPorSlug: vi.fn(),
    obtenerServiciosActivos: vi.fn(),
    obtenerSlotsDisponibles: vi.fn(),
    crearCita: vi.fn().mockResolvedValue({
      data: {
        id: "c-123",
        inicio: new Date("2026-10-10T10:00:00Z"),
        fin: new Date("2026-10-10T10:30:00Z"),
        clienteNombre: "Juan Perez",
        clienteEmail: "juan@test.com",
        estado: "confirmada",
      },
    }),
  };

  const usecase = new CrearCitaUseCase(mockRepo);

  it("rechaza si el nombre del cliente está vacío sin tocar el repositorio", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      servicioId: "srv-1",
      inicio: new Date("2026-10-10T10:00:00Z"),
      fin: new Date("2026-10-10T10:30:00Z"),
      clienteNombre: "   ",
      clienteEmail: "juan@test.com",
    });

    expect(res.failure).toBeDefined();
    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(mockRepo.crearCita).not.toHaveBeenCalled();
  });

  it("rechaza si el correo no tiene formato válido", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      servicioId: "srv-1",
      inicio: new Date("2026-10-10T10:00:00Z"),
      fin: new Date("2026-10-10T10:30:00Z"),
      clienteNombre: "Juan Perez",
      clienteEmail: "juan-sin-arroba",
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
  });

  it("llama al repositorio cuando los datos son válidos", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      servicioId: "srv-1",
      inicio: new Date("2026-10-10T10:00:00Z"),
      fin: new Date("2026-10-10T10:30:00Z"),
      clienteNombre: "Juan Perez",
      clienteEmail: "juan@test.com",
    });

    expect(res.data).toBeDefined();
    expect(res.data?.id).toBe("c-123");
    expect(mockRepo.crearCita).toHaveBeenCalledOnce();
  });
});
