import { describe, it, expect, vi } from "vitest";
import { CambiarEstadoServicioUseCase } from "./CambiarEstadoServicioUseCase";
import { IServiciosRepository } from "../repositories";

describe("CambiarEstadoServicioUseCase (Dominio)", () => {
  const mockRepo: IServiciosRepository = {
    listarServicios: vi.fn(),
    crearServicio: vi.fn(),
    actualizarServicio: vi.fn(),
    cambiarEstadoServicio: vi.fn().mockResolvedValue({}),
    eliminarServicio: vi.fn(),
    obtenerHorarios: vi.fn(),
    guardarHorarios: vi.fn(),
  };

  const usecase = new CambiarEstadoServicioUseCase(mockRepo);

  it("rechaza si el id del servicio está vacío", async () => {
    const res = await usecase.execute("   ", false);

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("identificador del servicio es requerido");
    expect(mockRepo.cambiarEstadoServicio).not.toHaveBeenCalled();
  });

  it("ejecuta el cambio de estado con éxito cuando el id es válido", async () => {
    const res = await usecase.execute("srv-123", true);

    expect(res.failure).toBeUndefined();
    expect(mockRepo.cambiarEstadoServicio).toHaveBeenCalledWith("srv-123", true);
  });

  it("permite pausar un servicio alternando su estado activo a false", async () => {
    const res = await usecase.execute("srv-123", false);

    expect(res.failure).toBeUndefined();
    expect(mockRepo.cambiarEstadoServicio).toHaveBeenCalledWith("srv-123", false);
  });
});
