import { describe, it, expect } from "vitest";
import { formatearFechaISO, obtenerDiasDelMes } from "./ACCalendar";

describe("ACCalendar (Utilidades)", () => {
  it("formatea correctamente un objeto Date a formato ISO YYYY-MM-DD", () => {
    const fecha = new Date(2026, 9, 15); // Octubre 15, 2026
    expect(formatearFechaISO(fecha)).toBe("2026-10-15");
  });

  it("calcula los días exactos para un mes específico incluyendo offsets", () => {
    // Febrero 2026 (28 días, empieza en Domingo = índice 0)
    const dias = obtenerDiasDelMes(2026, 1);
    const diasNoNulos = dias.filter((d) => d !== null);

    expect(diasNoNulos.length).toBe(28);
    expect(diasNoNulos[0]?.getDate()).toBe(1);
    expect(diasNoNulos[27]?.getDate()).toBe(28);
  });
});
