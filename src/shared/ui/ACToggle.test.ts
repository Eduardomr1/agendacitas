import { describe, it, expect } from "vitest";

describe("ACToggle Logic", () => {
  it("debe alternar de inactivo a activo al invocarse", () => {
    let activo = false;
    const onChange = (nuevo: boolean) => {
      activo = nuevo;
    };

    onChange(!activo);
    expect(activo).toBe(true);

    onChange(!activo);
    expect(activo).toBe(false);
  });

  it("debe filtrar correctamente días activos en configuración semanal", () => {
    const horarios = [
      { diaSemana: 0, activo: false },
      { diaSemana: 1, activo: true },
      { diaSemana: 2, activo: true },
      { diaSemana: 3, activo: true },
      { diaSemana: 4, activo: true },
      { diaSemana: 5, activo: true },
      { diaSemana: 6, activo: false },
    ];

    const diasLaborables = horarios.filter((h) => h.activo);
    expect(diasLaborables.length).toBe(5);
    expect(diasLaborables.map((h) => h.diaSemana)).toEqual([1, 2, 3, 4, 5]);
  });
});
