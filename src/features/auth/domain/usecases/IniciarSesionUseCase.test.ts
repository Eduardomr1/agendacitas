import { describe, it, expect, vi } from "vitest";
import { IniciarSesionUseCase } from "./IniciarSesionUseCase";
import { IAuthRepository } from "../repositories";

describe("IniciarSesionUseCase (Dominio)", () => {
  const mockRepo: IAuthRepository = {
    iniciarSesion: vi.fn().mockResolvedValue({
      data: { id: "usr-1", email: "dueno@negocio.com" },
    }),
    registrarse: vi.fn(),
    cerrarSesion: vi.fn(),
    obtenerUsuarioActual: vi.fn(),
  };

  const usecase = new IniciarSesionUseCase(mockRepo);

  it("rechaza si el email no es válido antes de consultar el repositorio", async () => {
    const res = await usecase.execute({ email: "invalido", password: "password123" });
    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(mockRepo.iniciarSesion).not.toHaveBeenCalled();
  });

  it("rechaza si la contraseña es menor a 6 caracteres", async () => {
    const res = await usecase.execute({ email: "admin@negocio.com", password: "123" });
    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("al menos 6 caracteres");
  });

  it("delega la autenticación al repositorio si los datos son válidos", async () => {
    const res = await usecase.execute({ email: "admin@negocio.com", password: "password123" });
    expect(res.data).toBeDefined();
    expect(res.data?.id).toBe("usr-1");
    expect(mockRepo.iniciarSesion).toHaveBeenCalledOnce();
  });
});
