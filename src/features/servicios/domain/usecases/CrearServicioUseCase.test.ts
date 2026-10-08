import { describe, it, expect, vi } from "vitest";
import { CrearServicioUseCase } from "./CrearServicioUseCase";
import { IServiciosRepository } from "../repositories";

describe("CrearServicioUseCase (Dominio)", () => {
  const mockRepo: IServiciosRepository = {
    listarServicios: vi.fn(),
    crearServicio: vi.fn().mockResolvedValue({
      data: {
        id: "srv-99",
        negocioId: "neg-1",
        nombre: "Corte Fade",
        descripcion: null,
        duracionMin: 45,
        precioCentavos: 20000,
        activo: true,
      },
    }),
    cambiarEstadoServicio: vi.fn(),
    eliminarServicio: vi.fn(),
    obtenerHorarios: vi.fn(),
    guardarHorarios: vi.fn(),
  };

  const usecase = new CrearServicioUseCase(mockRepo);

  it("rechaza si el nombre del servicio está en blanco", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      nombre: "   ",
      duracionMin: 30,
      precioCentavos: 10000,
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(mockRepo.crearServicio).not.toHaveBeenCalled();
  });

  it("rechaza duración negativa o cero", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      nombre: "Corte",
      duracionMin: 0,
      precioCentavos: 10000,
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("duración debe ser entre");
  });

  it("rechaza precio negativo", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      nombre: "Corte",
      duracionMin: 30,
      precioCentavos: -500,
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
  });

  it("crea el servicio con éxito si los datos son correctos", async () => {
    const res = await usecase.execute({
      negocioId: "neg-1",
      nombre: "Corte Fade",
      duracionMin: 45,
      precioCentavos: 20000,
    });

    expect(res.data).toBeDefined();
    expect(res.data?.id).toBe("srv-99");
    expect(mockRepo.crearServicio).toHaveBeenCalledOnce();
  });
});
