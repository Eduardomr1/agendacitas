import { describe, expect, it } from "vitest";
import {
  proyectarPlanSerieRecurrente,
  validarInputSerieRecurrente,
  type ProyeccionCitaRecurrenteInput,
} from "./citasRecurrentes";

describe("citasRecurrentes — Motor de Series Recurrentes", () => {
  const inputBase: ProyeccionCitaRecurrenteInput = {
    negocioId: "negocio-pilates",
    servicioId: "clase-semanal",
    fechaInicio: "2026-11-02", // Lunes
    horaInicio: "09:00",
    horaFin: "10:00",
    frecuencia: "semanal",
    totalOcurrencias: 4,
  };

  describe("validarInputSerieRecurrente", () => {
    it("aprueba input válido con parámetros consistentes", () => {
      const res = validarInputSerieRecurrente(inputBase);
      expect(res.valido).toBe(true);
      expect(res.errores).toHaveLength(0);
    });

    it("rechaza si total de ocurrencias es menor a 2 o mayor a 52", () => {
      const resMenor = validarInputSerieRecurrente({
        ...inputBase,
        totalOcurrencias: 1,
      });
      expect(resMenor.valido).toBe(false);
      expect(resMenor.errores).toContain(
        "Una serie recurrente debe incluir al menos 2 ocurrencias.",
      );

      const resMayor = validarInputSerieRecurrente({
        ...inputBase,
        totalOcurrencias: 60,
      });
      expect(resMayor.valido).toBe(false);
      expect(resMayor.errores).toContain(
        "El límite máximo por serie es de 52 ocurrencias.",
      );
    });

    it("rechaza horas invertidas", () => {
      const res = validarInputSerieRecurrente({
        ...inputBase,
        horaInicio: "11:00",
        horaFin: "10:00",
      });
      expect(res.valido).toBe(false);
      expect(res.errores).toContain(
        "La hora de inicio debe ser estrictamente anterior a la hora de fin.",
      );
    });
  });

  describe("proyectarPlanSerieRecurrente", () => {
    it("proyecta serie semanal limpia cada 7 días en lunes", () => {
      const plan = proyectarPlanSerieRecurrente(inputBase);
      expect(plan.totalSolicitado).toBe(4);
      expect(plan.totalValidas).toBe(4);
      expect(plan.esCompletamenteFactible).toBe(true);

      expect(plan.ocurrencias[0]?.fecha).toBe("2026-11-02");
      expect(plan.ocurrencias[1]?.fecha).toBe("2026-11-09");
      expect(plan.ocurrencias[2]?.fecha).toBe("2026-11-16");
      expect(plan.ocurrencias[3]?.fecha).toBe("2026-11-23");
    });

    it("proyecta serie quincenal cada 14 días", () => {
      const plan = proyectarPlanSerieRecurrente({
        ...inputBase,
        frecuencia: "quincenal",
        totalOcurrencias: 3,
      });
      expect(plan.totalValidas).toBe(3);
      expect(plan.ocurrencias[0]?.fecha).toBe("2026-11-02");
      expect(plan.ocurrencias[1]?.fecha).toBe("2026-11-16");
      expect(plan.ocurrencias[2]?.fecha).toBe("2026-11-30");
    });

    it("detecta y marca conflicto ante feriados o bloqueos de calendario", () => {
      const plan = proyectarPlanSerieRecurrente({
        ...inputBase,
        feriadosOFechasBloqueadas: ["2026-11-16"], // 3ra semana es festivo
      });

      expect(plan.esCompletamenteFactible).toBe(false);
      expect(plan.totalValidas).toBe(3);
      expect(plan.totalConflictivas).toBe(1);

      const terceraOcurrencia = plan.ocurrencias[2];
      expect(terceraOcurrencia?.estado).toBe("conflicto_feriado");
      expect(terceraOcurrencia?.motivoConflicto).toContain("feriado");
    });

    it("detecta colision contra cita previa en la misma franja", () => {
      const citasExistentes = [
        {
          id: "cita-previa-99",
          inicio: new Date("2026-11-09T09:30:00Z"),
          fin: new Date("2026-11-09T10:30:00Z"),
          estado: "confirmada",
        },
      ];

      const plan = proyectarPlanSerieRecurrente({
        ...inputBase,
        citasExistentes,
      });

      expect(plan.esCompletamenteFactible).toBe(false);
      expect(plan.totalValidas).toBe(3);
      expect(plan.totalConflictivas).toBe(1);

      const segundaOcurrencia = plan.ocurrencias[1];
      expect(segundaOcurrencia?.estado).toBe("conflicto_cita");
      expect(segundaOcurrencia?.motivoConflicto).toContain("Conflicto de horario");
    });

    it("marca ocurrencias que exceden la fecha limite maxima", () => {
      const plan = proyectarPlanSerieRecurrente({
        ...inputBase,
        fechaLimiteMaxima: "2026-11-20", // Corta antes de la 4ta semana (23 Nov)
      });

      expect(plan.totalValidas).toBe(3);
      expect(plan.totalConflictivas).toBe(1);
      expect(plan.ocurrencias[3]?.estado).toBe("fecha_limite_excedida");
    });
  });
});
