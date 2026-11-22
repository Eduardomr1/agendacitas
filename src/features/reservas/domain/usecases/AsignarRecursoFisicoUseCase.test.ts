import { describe, expect, it } from "vitest";
import {
  AsignarRecursoFisicoUseCase,
  MotorRecursosFisicos,
  type RecursoFisico,
} from "../../index";

describe("AsignarRecursoFisicoUseCase", () => {
  const useCase = new AsignarRecursoFisicoUseCase();

  const recursos: RecursoFisico[] = [
    {
      id: "cab-1",
      negocioId: "neg-clinica",
      nombre: "Cabina Láser 1",
      tipo: "CABINA",
      activo: true,
      serviciosCompatiblesIds: ["laser-facial", "combo-premium"],
      reservasAsignadas: [
        {
          citaId: "cita-10",
          especialistaId: "esp-ana",
          fecha: "2026-11-28",
          inicio: "10:00",
          fin: "11:00",
        },
      ],
    },
    {
      id: "cab-2",
      negocioId: "neg-clinica",
      nombre: "Cabina Láser 2",
      tipo: "CABINA",
      activo: true,
      serviciosCompatiblesIds: ["laser-facial", "combo-premium"],
      reservasAsignadas: [],
    },
    {
      id: "laser-portatil",
      negocioId: "neg-clinica",
      nombre: "Equipo Láser Portátil",
      tipo: "EQUIPO_LASER",
      activo: true,
      serviciosCompatiblesIds: ["combo-premium"],
      reservasAsignadas: [
        {
          citaId: "cita-10",
          especialistaId: "esp-ana",
          fecha: "2026-11-28",
          inicio: "10:00",
          fin: "11:00",
        },
      ],
    },
  ];

  it("asigna la cabina de menor carga cuando otra cabina está ocupada en la misma franja", () => {
    expect(MotorRecursosFisicos).toBeDefined();
    const res = useCase.execute({
      negocioId: "neg-clinica",
      solicitud: {
        servicioId: "laser-facial",
        fecha: "2026-11-28",
        horaInicio: "10:00",
        duracionMin: 60,
        tipoRecursoRequerido: "CABINA",
      },
      recursos,
    });

    expect(res.asignado).toBe(true);
    expect(res.recursoId).toBe("cab-2");
    expect(res.failure).toBeUndefined();
    expect(res.conflictosDetectados).toHaveLength(1);
    expect(res.conflictosDetectados[0]?.recursoId).toBe("cab-1");
  });

  it("emite Failure tipado SIN_RECURSO_FISICO_DISPONIBLE ante contención total de equipo compartido", () => {
    const res = useCase.asignarMultiplesRecursos({
      negocioId: "neg-clinica",
      servicioId: "combo-premium",
      fecha: "2026-11-28",
      horaInicio: "10:00",
      duracionMin: 60,
      requisitos: [
        { tipoRecursoRequerido: "CABINA" },
        { tipoRecursoRequerido: "EQUIPO_LASER" },
      ],
      recursos,
    });

    expect(res.asignado).toBe(false);
    expect(res.codigoDiagnostico).toBe("SIN_RECURSO_FISICO_DISPONIBLE");
    expect(res.failure?.tipo).toBe("SIN_RECURSO_FISICO_DISPONIBLE");
    expect(res.recursosAsignadosIds).toEqual([]);

    const slotsEquipo = useCase.calcularSlotsDisponibles({
      negocioId: "neg-clinica",
      servicioId: "combo-premium",
      fecha: "2026-11-28",
      horarioAtencion: { abre: "09:00", cierra: "13:00", activo: true },
      duracionServicioMin: 60,
      pasoMin: 60,
      tipoRecursoRequerido: "EQUIPO_LASER",
      recursos,
    });
    expect(slotsEquipo).toEqual(["09:00", "11:00", "12:00"]);
  });

  it("rechaza contratos de entrada inválidos (negocioId, fecha imposible, hora inválida, duración <= 0, buffer negativo)", () => {
    expect(() =>
      useCase.execute({
        negocioId: "",
        solicitud: {
          servicioId: "laser-facial",
          fecha: "2026-11-28",
          horaInicio: "10:00",
          duracionMin: 30,
        },
        recursos,
      })
    ).toThrow(/negocioId/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-clinica",
        solicitud: {
          servicioId: "laser-facial",
          fecha: "2026-02-30", // Fecha inexistente
          horaInicio: "10:00",
          duracionMin: 30,
        },
        recursos,
      })
    ).toThrow(/YYYY-MM-DD/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-clinica",
        solicitud: {
          servicioId: "laser-facial",
          fecha: "2026-11-28",
          horaInicio: "25:00",
          duracionMin: 30,
        },
        recursos,
      })
    ).toThrow(/HH:MM/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-clinica",
        solicitud: {
          servicioId: "laser-facial",
          fecha: "2026-11-28",
          horaInicio: "10:00",
          duracionMin: 0,
        },
        recursos,
      })
    ).toThrow(/duración/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-clinica",
        solicitud: {
          servicioId: "laser-facial",
          fecha: "2026-11-28",
          horaInicio: "10:00",
          duracionMin: 30,
          bufferDespuesMin: -5,
        },
        recursos,
      })
    ).toThrow(/bufferDespuesMin/);
  });
});
