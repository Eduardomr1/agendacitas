import { describe, it, expect, vi } from "vitest";
import { EliminarServicioUseCase } from "./EliminarServicioUseCase";
import { IServiciosRepository } from "../repositories";

describe("EliminarServicioUseCase (Dominio)", () => {
  const mockRepo: IServiciosRepository = {
    listarServicios: vi.fn(),
    crearServicio: vi.fn(),
    cambiarEstadoServicio: vi.fn(),
    eliminarServicio: vi.fn().mockResolvedValue({}),
    obtenerHorarios: vi.fn(),
    guardarHorarios: vi.fn(),
  };

  const usecase = new EliminarServicioUseCase(mockRepo);

  it("rechaza si el id del servicio a eliminar está vacío", async () => {
    const res = await usecase.execute("   ");

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("identificador del servicio a eliminar es requerido");
    expect(mockRepo.eliminarServicio).not.toHaveBeenCalled();
  });

  it("elimina el servicio con éxito cuando el id es válido", async () => {
    const res = await usecase.execute("srv-456");

    expect(res.failure).toBeUndefined();
    expect(mockRepo.eliminarServicio).toHaveBeenCalledWith("srv-456");
  });
});
