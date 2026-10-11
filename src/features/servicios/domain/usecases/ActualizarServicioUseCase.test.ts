import { describe, it, expect, vi } from "vitest";
import { ActualizarServicioUseCase } from "./ActualizarServicioUseCase";
import { IServiciosRepository } from "../repositories";

describe("ActualizarServicioUseCase (Dominio)", () => {
  const servicioActualizadoMock = {
    id: "srv-10",
    negocioId: "neg-1",
    nombre: "Corte y Estilizado",
    descripcion: "Lavado, corte de diseño y peinado",
    duracionMin: 50,
    precioCentavos: 35000,
    categoria: "Cortes",
    activo: true,
  };

  const mockRepo: IServiciosRepository = {
    listarServicios: vi.fn(),
    crearServicio: vi.fn(),
    actualizarServicio: vi.fn().mockResolvedValue({
      data: servicioActualizadoMock,
    }),
    cambiarEstadoServicio: vi.fn(),
    eliminarServicio: vi.fn(),
    obtenerHorarios: vi.fn(),
    guardarHorarios: vi.fn(),
  };

  const usecase = new ActualizarServicioUseCase(mockRepo);

  it("rechaza si el id del servicio está vacío o sólo contiene espacios", async () => {
    const res = await usecase.execute({
      id: "   ",
      nombre: "Nuevo Nombre",
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("identificador del servicio es requerido");
    expect(mockRepo.actualizarServicio).not.toHaveBeenCalled();
  });

  it("rechaza si el nombre proporcionado está en blanco", async () => {
    const res = await usecase.execute({
      id: "srv-10",
      nombre: "   ",
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("nombre del servicio no puede estar vacío");
    expect(mockRepo.actualizarServicio).not.toHaveBeenCalled();
  });

  it("rechaza si la duración es menor o igual a 0", async () => {
    const res = await usecase.execute({
      id: "srv-10",
      duracionMin: 0,
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("duración debe ser entre 1 minuto y 480 minutos");
  });

  it("rechaza si la duración excede el máximo permitido (480 minutos)", async () => {
    const res = await usecase.execute({
      id: "srv-10",
      duracionMin: 500,
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("duración debe ser entre 1 minuto y 480 minutos");
  });

  it("rechaza si el precio en centavos es negativo", async () => {
    const res = await usecase.execute({
      id: "srv-10",
      precioCentavos: -100,
    });

    expect(res.failure?.tipo).toBe("DATOS_INVALIDOS");
    expect(res.failure?.mensajeUsuario).toContain("precio del servicio no puede ser negativo");
  });

  it("actualiza satisfactoriamente un servicio con datos válidos", async () => {
    const res = await usecase.execute({
      id: "srv-10",
      nombre: "Corte y Estilizado",
      descripcion: "Lavado, corte de diseño y peinado",
      duracionMin: 50,
      precioCentavos: 35000,
      categoria: "Cortes",
    });

    expect(res.failure).toBeUndefined();
    expect(res.data).toEqual(servicioActualizadoMock);
    expect(mockRepo.actualizarServicio).toHaveBeenCalledWith({
      id: "srv-10",
      nombre: "Corte y Estilizado",
      descripcion: "Lavado, corte de diseño y peinado",
      duracionMin: 50,
      precioCentavos: 35000,
      categoria: "Cortes",
    });
  });

  it("permite actualizar únicamente campos específicos de forma parcial", async () => {
    const res = await usecase.execute({
      id: "srv-10",
      categoria: "Barbería Premium",
    });

    expect(res.failure).toBeUndefined();
    expect(mockRepo.actualizarServicio).toHaveBeenCalledWith({
      id: "srv-10",
      categoria: "Barbería Premium",
      nombre: undefined,
      descripcion: undefined,
    });
  });

  it("propaga el error si el repositorio devuelve una falla", async () => {
    mockRepo.actualizarServicio = vi.fn().mockResolvedValue({
      failure: {
        tipo: "BASE_DATOS",
        mensajeUsuario: "Error al actualizar registro en base de datos.",
      },
    });

    const res = await usecase.execute({
      id: "srv-10",
      nombre: "Nombre Válido",
    });

    expect(res.data).toBeUndefined();
    expect(res.failure?.tipo).toBe("BASE_DATOS");
  });
});
