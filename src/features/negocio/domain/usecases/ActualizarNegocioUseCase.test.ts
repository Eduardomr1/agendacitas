import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActualizarNegocioUseCase } from "./ActualizarNegocioUseCase";
import { INegocioRepository } from "../repositories";
import { NegocioConfig } from "../entities";

describe("ActualizarNegocioUseCase", () => {
  let repository: INegocioRepository;
  let useCase: ActualizarNegocioUseCase;

  const validOwnerId = "owner-123";
  const validPayload = {
    nombre: "Estudio Creativo",
    slug: "estudio-creativo",
    zonaHoraria: "America/Mexico_City",
  };

  const mockResponse: NegocioConfig = {
    id: "negocio-456",
    ownerId: validOwnerId,
    ...validPayload,
  };

  beforeEach(() => {
    repository = {
      obtenerPorOwner: vi.fn(),
      crearOActualizar: vi.fn(),
    };
    useCase = new ActualizarNegocioUseCase(repository);
  });

  it("retorna failure si ownerId está vacío", async () => {
    const result = await useCase.execute("", validPayload);

    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("propietario");
    expect(repository.crearOActualizar).not.toHaveBeenCalled();
  });

  it("retorna failure si el nombre está vacío o tiene menos de 2 caracteres", async () => {
    const resultVacio = await useCase.execute(validOwnerId, {
      ...validPayload,
      nombre: "   ",
    });
    expect(resultVacio.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(resultVacio.failure?.mensajeUsuario).toContain("no puede estar vacío");

    const resultCorto = await useCase.execute(validOwnerId, {
      ...validPayload,
      nombre: "A",
    });
    expect(resultCorto.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(resultCorto.failure?.mensajeUsuario).toContain("entre 2 y 80 caracteres");
    expect(repository.crearOActualizar).not.toHaveBeenCalled();
  });

  it("retorna failure si el slug tiene formato inválido o caracteres no permitidos", async () => {
    const invalidSlugs = ["ab", "Estudio Creativo", "slug_con_guion_bajo", "-inicio-guion", "fin-guion-", "slug@invalido"];

    for (const slug of invalidSlugs) {
      const result = await useCase.execute(validOwnerId, {
        ...validPayload,
        slug,
      });

      expect(result.failure).toBeDefined();
      expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
      expect(result.failure?.mensajeUsuario).toContain("slug");
    }

    expect(repository.crearOActualizar).not.toHaveBeenCalled();
  });

  it("retorna failure si la zona horaria está vacía", async () => {
    const result = await useCase.execute(validOwnerId, {
      ...validPayload,
      zonaHoraria: "   ",
    });

    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("zona horaria");
    expect(repository.crearOActualizar).not.toHaveBeenCalled();
  });

  it("normaliza slug y strings y delega con éxito al repositorio", async () => {
    vi.mocked(repository.crearOActualizar).mockResolvedValue({
      data: mockResponse,
    });

    const result = await useCase.execute("  owner-123  ", {
      nombre: "  Estudio Creativo  ",
      slug: "  ESTUDIO-CREATIVO  ",
      zonaHoraria: "  America/Mexico_City  ",
    });

    expect(repository.crearOActualizar).toHaveBeenCalledWith("owner-123", {
      nombre: "Estudio Creativo",
      slug: "estudio-creativo",
      zonaHoraria: "America/Mexico_City",
    });
    expect(result.data).toEqual(mockResponse);
    expect(result.failure).toBeUndefined();
  });
});
