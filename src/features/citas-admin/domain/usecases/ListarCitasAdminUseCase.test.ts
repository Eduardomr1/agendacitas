import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListarCitasAdminUseCase } from "./ListarCitasAdminUseCase";
import { ICitasAdminRepository } from "../repositories";
import { CitaAdminItem } from "../entities";

describe("ListarCitasAdminUseCase", () => {
  let repository: ICitasAdminRepository;
  let useCase: ListarCitasAdminUseCase;

  const mockCitas: CitaAdminItem[] = [
    {
      id: "c-1",
      negocioId: "neg-1",
      servicioId: "srv-1",
      servicioNombre: "Corte de cabello",
      duracionMin: 30,
      precioCentavos: 25000,
      inicio: new Date("2026-10-15T10:00:00Z"),
      fin: new Date("2026-10-15T10:30:00Z"),
      clienteNombre: "Carlos Ruiz",
      clienteEmail: "carlos@test.com",
      clienteTelefono: "6621234567",
      estado: "confirmada",
    },
  ];

  beforeEach(() => {
    repository = {
      listarCitas: vi.fn(),
      actualizarEstadoCita: vi.fn(),
    };
    useCase = new ListarCitasAdminUseCase(repository);
  });

  it("retorna failure si negocioId está vacío", async () => {
    const result = await useCase.execute({ negocioId: "   " });

    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("requerido");
    expect(repository.listarCitas).not.toHaveBeenCalled();
  });

  it("retorna failure si la fecha de inicio es posterior a la fecha de fin", async () => {
    const result = await useCase.execute({
      negocioId: "neg-1",
      fechaInicio: new Date("2026-10-20"),
      fechaFin: new Date("2026-10-10"),
    });

    expect(result.failure).toBeDefined();
    expect(result.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(result.failure?.mensajeUsuario).toContain("posterior");
    expect(repository.listarCitas).not.toHaveBeenCalled();
  });

  it("recorta negocioId y delega la consulta al repositorio exitosamente", async () => {
    vi.mocked(repository.listarCitas).mockResolvedValue({ data: mockCitas });

    const fechaInicio = new Date("2026-10-01");
    const fechaFin = new Date("2026-10-31");

    const result = await useCase.execute({
      negocioId: "  neg-1  ",
      fechaInicio,
      fechaFin,
      estado: "confirmada",
    });

    expect(repository.listarCitas).toHaveBeenCalledWith({
      negocioId: "neg-1",
      fechaInicio,
      fechaFin,
      estado: "confirmada",
    });
    expect(result.data).toEqual(mockCitas);
    expect(result.failure).toBeUndefined();
  });
});
