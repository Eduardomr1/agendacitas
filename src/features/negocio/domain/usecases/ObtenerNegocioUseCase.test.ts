import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObtenerNegocioUseCase } from "./ObtenerNegocioUseCase";
import { INegocioRepository } from "../repositories";
import { NegocioConfig } from "../entities";

describe("ObtenerNegocioUseCase", () => {
  let repository: INegocioRepository;
  let useCase: ObtenerNegocioUseCase;

  const mockNegocio: NegocioConfig = {
    id: "negocio-1",
    ownerId: "owner-1",
    slug: "estudio-flow",
    nombre: "Estudio Flow",
    zonaHoraria: "America/Hermosillo",
  };

  beforeEach(() => {
    repository = {
      obtenerPorOwner: vi.fn(),
      crearOActualizar: vi.fn(),
    };
    useCase = new ObtenerNegocioUseCase(repository);
  });

  it("retorna failure si ownerId está vacío", async () => {
    const result = await useCase.execute("   ");

    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("requerido");
    expect(repository.obtenerPorOwner).not.toHaveBeenCalled();
  });

  it("llama al repositorio con ownerId recortado y retorna los datos", async () => {
    vi.mocked(repository.obtenerPorOwner).mockResolvedValue({
      data: mockNegocio,
    });

    const result = await useCase.execute("  owner-1  ");

    expect(repository.obtenerPorOwner).toHaveBeenCalledWith("owner-1");
    expect(result.data).toEqual(mockNegocio);
    expect(result.failure).toBeUndefined();
  });
});
