import { describe, it, expect } from "vitest";
import {
  horaAMinutos,
  minutosAHora,
  calcularHorariosDisponibles,
} from "./disponibilidad";

describe("Cálculo de Disponibilidad de Horarios", () => {
  it("convierte horas en formato HH:MM a minutos y viceversa", () => {
    expect(horaAMinutos("09:00")).toBe(540);
    expect(horaAMinutos("14:30")).toBe(870);
    expect(minutosAHora(540)).toBe("09:00");
    expect(minutosAHora(870)).toBe("14:30");
  });

  it("calcula slots continuos en un día completamente vacío", () => {
    const horario = { inicioMin: 540, finMin: 660 }; // 09:00 a 11:00 (120 min)
    const citas: any[] = [];
    const duracion = 30; // 30 min por cita, paso de 30 min

    const slots = calcularHorariosDisponibles(horario, citas, duracion, 30);
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("excluye slots que chocan con citas ya existentes", () => {
    const horario = { inicioMin: 540, finMin: 720 }; // 09:00 a 12:00
    // Cita existente de 10:00 a 11:00 (600 a 660)
    const citas = [{ inicioMin: 600, finMin: 660 }];
    const duracion = 30;

    const slots = calcularHorariosDisponibles(horario, citas, duracion, 30);
    // Debería permitir 09:00, 09:30, 11:00, 11:30
    expect(slots).toEqual(["09:00", "09:30", "11:00", "11:30"]);
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
  });

  it("impide reservar un servicio largo si no cabe antes del cierre o de la próxima cita", () => {
    const horario = { inicioMin: 540, finMin: 720 }; // 09:00 a 12:00
    // Cita a las 10:00 a 11:30 (600 a 690)
    const citas = [{ inicioMin: 600, finMin: 690 }];
    const duracion = 60; // 1 hora de servicio

    const slots = calcularHorariosDisponibles(horario, citas, duracion, 30);
    // 09:00 cabe perfectamente (termina 10:00, justo antes de la cita)
    // 09:30 terminaría 10:30 (choca con la cita de 10:00)
    // 10:00 a 11:00 choca con la cita
    // 11:30 cabe pero si cierra a 12:00 solo tiene 30 min, no 60 min.
    expect(slots).toEqual(["09:00"]);
  });
});
