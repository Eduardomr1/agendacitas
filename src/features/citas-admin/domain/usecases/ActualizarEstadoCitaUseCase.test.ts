import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActualizarEstadoCitaUseCase } from "./ActualizarEstadoCitaUseCase";
import { ICitasAdminRepository } from "../repositories";
import { EstadoCita } from "../entities";

describe("ActualizarEstadoCitaUseCase", () => {
  let repository: ICitasAdminRepository;
  let useCase: ActualizarEstadoCitaUseCase;

  beforeEach(() => {
    repository = {
      listarCitas: vi.fn(),
      actualizarEstadoCita: vi.fn(),
    };
    useCase = new ActualizarEstadoCitaUseCase(repository);
  });

  it("retorna failure si el id de la cita está vacío", async () => {
    const result = await useCase.execute("   ", "confirmada");

    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("requerido");
    expect(repository.actualizarEstadoCita).not.toHaveBeenCalled();
  });

  it("retorna failure si el estado no es válido", async () => {
    const result = await useCase.execute("cita-1", "invalido" as EstadoCita);

    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("no es válido");
    expect(repository.actualizarEstadoCita).not.toHaveBeenCalled();
  });

  it("delega la actualización al repositorio cuando los datos son válidos", async () => {
    vi.mocked(repository.actualizarEstadoCita).mockResolvedValue({});

    const result = await useCase.execute("  cita-99  ", "completada");

    expect(repository.actualizarEstadoCita).toHaveBeenCalledWith("cita-99", "completada");
    expect(result.failure).toBeUndefined();
  });
});
