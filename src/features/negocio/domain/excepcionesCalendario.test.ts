import { describe, it, expect } from "vitest";
import {
  esFechaISOValida,
  obtenerDiaSemanaFechaISO,
  coincideExcepcionEnFecha,
  validarExcepcionCalendario,
  detectarConflictosExcepciones,
  resolverHorarioEfectivoFecha,
  filtrarExcepcionesEnRango,
} from "./excepcionesCalendario";
import { generarHorariosPorDefecto } from "./horariosAtencion";
import { ExcepcionCalendario } from "./entities";

describe("Motor de Excepciones de Calendario y Feriados - Dominio Puro", () => {
  describe("Validación estricta de fechas ISO y día de semana", () => {
    it("acepta fechas reales del calendario gregoriano incluyendo bisiestos", () => {
      expect(esFechaISOValida("2026-10-22")).toBe(true);
      expect(esFechaISOValida("2028-02-29")).toBe(true); // Año bisiesto
    });

    it("rechaza fechas inexistentes o formatos incorrectos", () => {
      expect(esFechaISOValida("2026-02-29")).toBe(false); // No bisiesto
      expect(esFechaISOValida("2026-04-31")).toBe(false); // Abril tiene 30 días
      expect(esFechaISOValida("2026-13-01")).toBe(false);
      expect(esFechaISOValida("22/10/2026")).toBe(false);
      expect(esFechaISOValida("")).toBe(false);
    });

    it("calcula el día de la semana sin deriva de zona horaria", () => {
      // 2026-10-22 es Jueves (4), 2026-10-25 es Domingo (0)
      expect(obtenerDiaSemanaFechaISO("2026-10-22")).toBe(4);
      expect(obtenerDiaSemanaFechaISO("2026-10-25")).toBe(0);
    });
  });

  describe("Coincidencia exacta y recurrencia anual de feriados", () => {
    const navidadAnual: ExcepcionCalendario = {
      id: "exc-navidad",
      negocioId: "neg-1",
      fecha: "2026-12-25",
      tipo: "feriado_cerrado",
      motivo: "Navidad",
      recurrenteAnual: true,
    };

    it("detecta coincidencia en años futuros cuando recurrenteAnual es true", () => {
      expect(coincideExcepcionEnFecha(navidadAnual, "2026-12-25")).toBe(true);
      expect(coincideExcepcionEnFecha(navidadAnual, "2027-12-25")).toBe(true);
      expect(coincideExcepcionEnFecha(navidadAnual, "2027-12-24")).toBe(false);
    });

    it("restringe coincidencia al año exacto cuando recurrenteAnual es false", () => {
      const cierreUnico: ExcepcionCalendario = {
        ...navidadAnual,
        recurrenteAnual: false,
      };
      expect(coincideExcepcionEnFecha(cierreUnico, "2026-12-25")).toBe(true);
      expect(coincideExcepcionEnFecha(cierreUnico, "2027-12-25")).toBe(false);
    });
  });

  describe("Validación de reglas de dominio y conflictos entre excepciones", () => {
    it("valida campos requeridos según el tipo de excepción", () => {
      const feriadoValido = validarExcepcionCalendario({
        negocioId: "neg-1",
        fecha: "2026-11-16",
        tipo: "feriado_cerrado",
        motivo: "Día de la Revolución",
      });
      expect(feriadoValido.valido).toBe(true);

      const especialInvalido = validarExcepcionCalendario({
        negocioId: "neg-1",
        fecha: "2026-12-24",
        tipo: "horario_especial",
        motivo: "Nochebuena",
        aperturaEspecial: "15:00",
        cierreEspecial: "10:00",
      });
      expect(especialInvalido.valido).toBe(false);
      expect(especialInvalido.errores.length).toBeGreaterThan(0);

      const bloqueoSinHoras = validarExcepcionCalendario({
        negocioId: "neg-1",
        fecha: "2026-10-28",
        tipo: "bloqueo_parcial",
        motivo: "Mantenimiento eléctrico",
      });
      expect(bloqueoSinHoras.valido).toBe(false);
    });

    it("detecta solapamientos entre bloqueos parciales en la misma fecha", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "b1",
          negocioId: "neg-1",
          fecha: "2026-10-22",
          tipo: "bloqueo_parcial",
          motivo: "Capacitación",
          bloqueoInicio: "10:00",
          bloqueoFin: "12:00",
        },
        {
          id: "b2",
          negocioId: "neg-1",
          fecha: "2026-10-22",
          tipo: "bloqueo_parcial",
          motivo: "Inventario",
          bloqueoInicio: "11:30",
          bloqueoFin: "13:00",
        },
      ];

      const conflicto = detectarConflictosExcepciones(excepciones, "2026-10-22");
      expect(conflicto.hayConflicto).toBe(true);
      expect(conflicto.detalle).toContain("se solapan");
    });

    it("permite bloqueos parciales contiguos que no se solapan", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "b1",
          negocioId: "neg-1",
          fecha: "2026-10-22",
          tipo: "bloqueo_parcial",
          motivo: "Bloque A",
          bloqueoInicio: "10:00",
          bloqueoFin: "11:00",
        },
        {
          id: "b2",
          negocioId: "neg-1",
          fecha: "2026-10-22",
          tipo: "bloqueo_parcial",
          motivo: "Bloque B",
          bloqueoInicio: "11:00",
          bloqueoFin: "12:00",
        },
      ];

      expect(detectarConflictosExcepciones(excepciones, "2026-10-22").hayConflicto).toBe(
        false
      );
    });
  });

  describe("Resolución de horario efectivo (resolverHorarioEfectivoFecha)", () => {
    const semanaBase = generarHorariosPorDefecto(); // Lun-Vie 09:00-18:00 (receso 14:00-15:00), Sab 09:00-14:00, Dom cerrado

    it("cierra completamente un día laboral si coincide con un feriado", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "e1",
          negocioId: "neg-1",
          fecha: "2025-12-25",
          tipo: "feriado_cerrado",
          motivo: "Navidad",
          recurrenteAnual: true,
        },
      ];

      // 2026-12-25 es Viernes
      const efectivo = resolverHorarioEfectivoFecha(
        "2026-12-25",
        semanaBase,
        excepciones
      );
      expect(efectivo.abierto).toBe(false);
      expect(efectivo.origen).toBe("feriado_cerrado");
      expect(efectivo.motivoExcepcion).toBe("Navidad");
    });

    it("habilita atención en Domingo si existe un horario_especial activo", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "e2",
          negocioId: "neg-1",
          fecha: "2026-12-20", // Domingo
          tipo: "horario_especial",
          motivo: "Domingo pre-navideño",
          aperturaEspecial: "10:00",
          cierreEspecial: "16:00",
        },
      ];

      const efectivo = resolverHorarioEfectivoFecha(
        "2026-12-20",
        semanaBase,
        excepciones
      );
      expect(efectivo.abierto).toBe(true);
      expect(efectivo.origen).toBe("horario_especial");
      expect(efectivo.apertura).toBe("10:00");
      expect(efectivo.cierre).toBe("16:00");
    });

    it("omite el receso semanal cuando el horario especial termina antes del almuerzo", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "e3",
          negocioId: "neg-1",
          fecha: "2026-12-24", // Jueves (receso base 14:00-15:00)
          tipo: "horario_especial",
          motivo: "Jornada reducida Nochebuena",
          aperturaEspecial: "09:00",
          cierreEspecial: "13:00",
        },
      ];

      const efectivo = resolverHorarioEfectivoFecha(
        "2026-12-24",
        semanaBase,
        excepciones
      );
      expect(efectivo.abierto).toBe(true);
      expect(efectivo.receso).toBeNull();
    });

    it("recorta bloqueos parciales a los límites de la jornada laboral", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "e4",
          negocioId: "neg-1",
          fecha: "2026-10-22", // Jueves 09:00-18:00
          tipo: "bloqueo_parcial",
          motivo: "Fumigación matutina",
          bloqueoInicio: "07:30",
          bloqueoFin: "10:30",
        },
      ];

      const efectivo = resolverHorarioEfectivoFecha(
        "2026-10-22",
        semanaBase,
        excepciones
      );
      expect(efectivo.abierto).toBe(true);
      expect(efectivo.bloqueosParciales).toEqual([
        { inicio: "09:00", fin: "10:30" },
      ]);
    });
  });

  describe("Proyección de excepciones en rango de fechas", () => {
    it("proyecta feriados anuales a lo largo de múltiples años respetando bisiestos", () => {
      const excepciones: ExcepcionCalendario[] = [
        {
          id: "ano-nuevo",
          negocioId: "neg-1",
          fecha: "2025-01-01",
          tipo: "feriado_cerrado",
          motivo: "Año Nuevo",
          recurrenteAnual: true,
        },
        {
          id: "bisiesto",
          negocioId: "neg-1",
          fecha: "2024-02-29",
          tipo: "horario_especial",
          motivo: "Aniversario bisiesto",
          aperturaEspecial: "10:00",
          cierreEspecial: "14:00",
          recurrenteAnual: true,
        },
      ];

      const enRango = filtrarExcepcionesEnRango(
        excepciones,
        "2026-01-01",
        "2028-03-01"
      );

      expect(enRango.map((r) => r.fechaEfectiva)).toEqual([
        "2026-01-01",
        "2027-01-01",
        "2028-01-01",
        "2028-02-29",
      ]);
    });
  });
});
