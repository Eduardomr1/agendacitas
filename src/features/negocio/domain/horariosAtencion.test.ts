import { describe, it, expect } from "vitest";
import {
  esFormatoHoraValido,
  horaAMinutos,
  minutosAHora,
  formatearHora12,
  validarIntervalo,
  validarRecesoConHorario,
  haySolapamientoIntervalos,
  validarIntervalosSinSolapamiento,
  validarHorarioDia,
  validarSemanaHorarios,
  calcularMinutosTrabajo,
  calcularHorasSemanalesTotales,
  contarDiasAbiertos,
  obtenerTurnosEfectivos,
  formatearResumenHorarioDia,
  generarHorariosPorDefecto,
  DIAS_SEMANA_INFO,
} from "./horariosAtencion";
import { HorarioDiaConfig } from "./entities";

describe("Módulo de Dominio: Horarios de Atención e Intervalos", () => {
  describe("Validación y conversión de formatos de hora", () => {
    it("debe validar correctamente formatos de hora válidos (HH:MM de 24 horas)", () => {
      expect(esFormatoHoraValido("00:00")).toBe(true);
      expect(esFormatoHoraValido("09:00")).toBe(true);
      expect(esFormatoHoraValido("14:30")).toBe(true);
      expect(esFormatoHoraValido("23:59")).toBe(true);
    });

    it("debe rechazar formatos de hora inválidos", () => {
      expect(esFormatoHoraValido("24:00")).toBe(false);
      expect(esFormatoHoraValido("12:60")).toBe(false);
      expect(esFormatoHoraValido("9:00")).toBe(false); // falta cero inicial
      expect(esFormatoHoraValido("12:0")).toBe(false);
      expect(esFormatoHoraValido("")).toBe(false);
      expect(esFormatoHoraValido("invalido")).toBe(false);
      expect(esFormatoHoraValido(null as unknown as string)).toBe(false);
    });

    it("debe convertir HH:MM a minutos transcurridos desde medianoche con precisión", () => {
      expect(horaAMinutos("00:00")).toBe(0);
      expect(horaAMinutos("01:00")).toBe(60);
      expect(horaAMinutos("09:00")).toBe(540);
      expect(horaAMinutos("14:30")).toBe(870);
      expect(horaAMinutos("18:00")).toBe(1080);
      expect(horaAMinutos("23:59")).toBe(1439);
    });

    it("debe lanzar un error si se intenta convertir una hora con formato inválido", () => {
      expect(() => horaAMinutos("25:00")).toThrow();
      expect(() => horaAMinutos("abc")).toThrow();
    });

    it("debe convertir minutos a formato HH:MM", () => {
      expect(minutosAHora(0)).toBe("00:00");
      expect(minutosAHora(60)).toBe("01:00");
      expect(minutosAHora(540)).toBe("09:00");
      expect(minutosAHora(870)).toBe("14:30");
      expect(minutosAHora(1080)).toBe("18:00");
    });

    it("debe formatear a formato legible 12 horas con AM/PM", () => {
      expect(formatearHora12("00:00")).toBe("12:00 AM");
      expect(formatearHora12("09:00")).toBe("9:00 AM");
      expect(formatearHora12("12:00")).toBe("12:00 PM");
      expect(formatearHora12("14:30")).toBe("2:30 PM");
      expect(formatearHora12("23:15")).toBe("11:15 PM");
    });
  });

  describe("Validación pura de intervalos de horario", () => {
    it("debe aceptar un intervalo donde hora inicio < hora fin", () => {
      const res = validarIntervalo("09:00", "18:00");
      expect(res.valido).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("debe rechazar un intervalo donde hora inicio es igual a hora fin", () => {
      const res = validarIntervalo("10:00", "10:00");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("estrictamente anterior");
    });

    it("debe rechazar un intervalo donde hora inicio es posterior a hora fin", () => {
      const res = validarIntervalo("18:00", "09:00");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("estrictamente anterior");
    });

    it("debe rechazar intervalos con horas en formato incorrecto", () => {
      const res = validarIntervalo("9:00", "18:00");
      expect(res.valido).toBe(false);
      expect(res.error).toContain("formato inválido");
    });
  });

  describe("Validación de intervalos de descanso (lunch break / receso)", () => {
    it("debe aceptar un descanso válido dentro de la jornada laboral", () => {
      const res = validarRecesoConHorario("09:00", "18:00", {
        inicio: "14:00",
        fin: "15:00",
      });
      expect(res.valido).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("debe rechazar un descanso que inicia antes de la hora de apertura", () => {
      const res = validarRecesoConHorario("09:00", "18:00", {
        inicio: "08:30",
        fin: "10:00",
      });
      expect(res.valido).toBe(false);
      expect(res.error).toContain("no puede comenzar antes de la hora de apertura");
    });

    it("debe rechazar un descanso que termina después de la hora de cierre", () => {
      const res = validarRecesoConHorario("09:00", "18:00", {
        inicio: "17:00",
        fin: "18:30",
      });
      expect(res.valido).toBe(false);
      expect(res.error).toContain("no puede finalizar después de la hora de cierre");
    });

    it("debe rechazar un descanso cuya hora de inicio sea mayor o igual a la de fin", () => {
      const res = validarRecesoConHorario("09:00", "18:00", {
        inicio: "15:00",
        fin: "14:00",
      });
      expect(res.valido).toBe(false);
      expect(res.error).toContain("Intervalo de descanso inválido");
    });

    it("debe rechazar un descanso que abarque la totalidad de la jornada laboral", () => {
      const res = validarRecesoConHorario("09:00", "18:00", {
        inicio: "09:00",
        fin: "18:00",
      });
      expect(res.valido).toBe(false);
      expect(res.error).toContain("no puede ocupar toda la jornada laboral");
    });
  });

  describe("Detección de solapamiento de intervalos", () => {
    it("debe detectar solapamiento entre intervalos superpuestos", () => {
      const a = { inicio: "09:00", fin: "13:00" };
      const b = { inicio: "12:00", fin: "15:00" };
      expect(haySolapamientoIntervalos(a, b)).toBe(true);
      expect(haySolapamientoIntervalos(b, a)).toBe(true);
    });

    it("debe confirmar que intervalos adyacentes no se solapan", () => {
      const a = { inicio: "09:00", fin: "13:00" };
      const b = { inicio: "13:00", fin: "18:00" };
      expect(haySolapamientoIntervalos(a, b)).toBe(false);
      expect(haySolapamientoIntervalos(b, a)).toBe(false);
    });

    it("debe confirmar que intervalos disjuntos y separados no se solapan", () => {
      const a = { inicio: "09:00", fin: "12:00" };
      const b = { inicio: "14:00", fin: "18:00" };
      expect(haySolapamientoIntervalos(a, b)).toBe(false);
    });

    it("debe validar una lista completa de turnos sin solapamiento", () => {
      const intervalos = [
        { inicio: "09:00", fin: "13:00" },
        { inicio: "14:00", fin: "18:00" },
        { inicio: "19:00", fin: "21:00" },
      ];
      const res = validarIntervalosSinSolapamiento(intervalos);
      expect(res.valido).toBe(true);
    });

    it("debe rechazar una lista de turnos cuando hay solapamiento entre alguno de ellos", () => {
      const intervalos = [
        { inicio: "09:00", fin: "13:00" },
        { inicio: "12:30", fin: "16:00" },
      ];
      const res = validarIntervalosSinSolapamiento(intervalos);
      expect(res.valido).toBe(false);
      expect(res.error).toContain("Existe un solapamiento");
    });
  });

  describe("Validación de configuración de día laboral (HorarioDiaConfig)", () => {
    it("debe considerar válido un día marcado como cerrado sin importar horarios", () => {
      const diaCerrado: HorarioDiaConfig = {
        diaSemana: 0,
        nombreDia: "Domingo",
        activo: false,
        apertura: "00:00",
        cierre: "00:00",
      };
      const res = validarHorarioDia(diaCerrado);
      expect(res.valido).toBe(true);
      expect(res.errores).toEqual({});
    });

    it("debe validar un día abierto sin descanso configurado", () => {
      const diaAbierto: HorarioDiaConfig = {
        diaSemana: 1,
        nombreDia: "Lunes",
        activo: true,
        apertura: "08:00",
        cierre: "17:00",
      };
      const res = validarHorarioDia(diaAbierto);
      expect(res.valido).toBe(true);
      expect(res.errores).toEqual({});
    });

    it("debe validar un día abierto con descanso activo dentro de horario", () => {
      const diaConDescanso: HorarioDiaConfig = {
        diaSemana: 2,
        nombreDia: "Martes",
        activo: true,
        apertura: "09:00",
        cierre: "19:00",
        receso: {
          activo: true,
          inicio: "14:00",
          fin: "15:00",
        },
      };
      const res = validarHorarioDia(diaConDescanso);
      expect(res.valido).toBe(true);
      expect(res.errores).toEqual({});
    });

    it("debe señalar errores si el día tiene hora de cierre anterior a la de apertura", () => {
      const diaInvalido: HorarioDiaConfig = {
        diaSemana: 3,
        nombreDia: "Miércoles",
        activo: true,
        apertura: "18:00",
        cierre: "09:00",
      };
      const res = validarHorarioDia(diaInvalido);
      expect(res.valido).toBe(false);
      expect(res.errores.cierre).toBeDefined();
    });

    it("debe señalar error si el descanso se sale de las horas laborales", () => {
      const diaDescansoInvalido: HorarioDiaConfig = {
        diaSemana: 4,
        nombreDia: "Jueves",
        activo: true,
        apertura: "09:00",
        cierre: "18:00",
        receso: {
          activo: true,
          inicio: "17:30",
          fin: "19:00",
        },
      };
      const res = validarHorarioDia(diaDescansoInvalido);
      expect(res.valido).toBe(false);
      expect(res.errores.receso).toContain("no puede finalizar después de la hora de cierre");
    });

    it("debe validar la semana completa e indicar errores por día", () => {
      const semana = generarHorariosPorDefecto();
      const resInicial = validarSemanaHorarios(semana);
      expect(resInicial.valido).toBe(true);

      // Mutamos Lunes con un error
      semana[0].cierre = "08:00"; // apertura es 09:00
      const resConError = validarSemanaHorarios(semana);
      expect(resConError.valido).toBe(false);
      expect(resConError.erroresPorDia[1]).toBeDefined();
    });
  });

  describe("Cálculos matemáticos de horas y turnos efectivos", () => {
    it("debe calcular minutos de trabajo restando el descanso activo", () => {
      const dia: HorarioDiaConfig = {
        diaSemana: 1,
        nombreDia: "Lunes",
        activo: true,
        apertura: "09:00", // 540 min
        cierre: "18:00",   // 1080 min -> total 540 min (9 horas)
        receso: {
          activo: true,
          inicio: "14:00", // 840 min
          fin: "15:00",    // 900 min -> 60 min de descanso
        },
      };
      // 540 - 60 = 480 minutos (8 horas)
      expect(calcularMinutosTrabajo(dia)).toBe(480);
    });

    it("debe calcular minutos de trabajo completos si el descanso está inactivo", () => {
      const dia: HorarioDiaConfig = {
        diaSemana: 1,
        nombreDia: "Lunes",
        activo: true,
        apertura: "09:00",
        cierre: "18:00",
        receso: {
          activo: false,
          inicio: "14:00",
          fin: "15:00",
        },
      };
      expect(calcularMinutosTrabajo(dia)).toBe(540); // 9 horas completas
    });

    it("debe retornar 0 minutos para un día cerrado", () => {
      const dia: HorarioDiaConfig = {
        diaSemana: 0,
        nombreDia: "Domingo",
        activo: false,
        apertura: "09:00",
        cierre: "18:00",
      };
      expect(calcularMinutosTrabajo(dia)).toBe(0);
    });

    it("debe calcular correctamente el total de horas semanales para la plantilla por defecto", () => {
      const semana = generarHorariosPorDefecto();
      // Lun-Vie: 5 días * 8 horas = 40 horas
      // Sáb: 1 día * 5 horas = 5 horas
      // Dom: Cerrado = 0 horas
      // Total = 45 horas
      expect(calcularHorasSemanalesTotales(semana)).toBe(45);
    });

    it("debe contar días abiertos y cerrados de la semana", () => {
      const semana = generarHorariosPorDefecto();
      const conteo = contarDiasAbiertos(semana);
      expect(conteo.abiertos).toBe(6);
      expect(conteo.cerrados).toBe(1);
    });

    it("debe descomponer en turnos efectivos un día con descanso", () => {
      const dia: HorarioDiaConfig = {
        diaSemana: 1,
        nombreDia: "Lunes",
        activo: true,
        apertura: "09:00",
        cierre: "18:00",
        receso: {
          activo: true,
          inicio: "13:00",
          fin: "14:00",
        },
      };
      const turnos = obtenerTurnosEfectivos(dia);
      expect(turnos).toHaveLength(2);
      expect(turnos[0]).toEqual({ inicio: "09:00", fin: "13:00" });
      expect(turnos[1]).toEqual({ inicio: "14:00", fin: "18:00" });
    });

    it("debe retornar un solo turno continuo si no hay descanso activo", () => {
      const dia: HorarioDiaConfig = {
        diaSemana: 6,
        nombreDia: "Sábado",
        activo: true,
        apertura: "09:00",
        cierre: "14:00",
      };
      const turnos = obtenerTurnosEfectivos(dia);
      expect(turnos).toHaveLength(1);
      expect(turnos[0]).toEqual({ inicio: "09:00", fin: "14:00" });
    });

    it("debe retornar arreglo vacío de turnos si el día está cerrado", () => {
      const dia: HorarioDiaConfig = {
        diaSemana: 0,
        nombreDia: "Domingo",
        activo: false,
        apertura: "09:00",
        cierre: "14:00",
      };
      expect(obtenerTurnosEfectivos(dia)).toEqual([]);
    });

    it("debe formatear el resumen en texto para vista rápida", () => {
      const diaAbiertoConReceso: HorarioDiaConfig = {
        diaSemana: 1,
        nombreDia: "Lunes",
        activo: true,
        apertura: "09:00",
        cierre: "18:00",
        receso: { activo: true, inicio: "14:00", fin: "15:00" },
      };
      expect(formatearResumenHorarioDia(diaAbiertoConReceso)).toBe(
        "09:00 - 18:00 (Receso: 14:00 - 15:00)"
      );

      const diaCerrado: HorarioDiaConfig = {
        diaSemana: 0,
        nombreDia: "Domingo",
        activo: false,
        apertura: "09:00",
        cierre: "14:00",
      };
      expect(formatearResumenHorarioDia(diaCerrado)).toBe("Cerrado");
    });
  });

  describe("Generación y metadatos de días", () => {
    it("debe contener la lista de 7 días con orden laboral de Lunes a Domingo", () => {
      expect(DIAS_SEMANA_INFO).toHaveLength(7);
      expect(DIAS_SEMANA_INFO[0].nombre).toBe("Lunes");
      expect(DIAS_SEMANA_INFO[6].nombre).toBe("Domingo");
    });

    it("debe generar la plantilla por defecto con 7 días configurados", () => {
      const semana = generarHorariosPorDefecto();
      expect(semana).toHaveLength(7);
      const lunes = semana.find((d) => d.diaSemana === 1);
      expect(lunes?.activo).toBe(true);
      expect(lunes?.apertura).toBe("09:00");
      expect(lunes?.cierre).toBe("18:00");
      expect(lunes?.receso?.activo).toBe(true);

      const domingo = semana.find((d) => d.diaSemana === 0);
      expect(domingo?.activo).toBe(false);
    });
  });
});
