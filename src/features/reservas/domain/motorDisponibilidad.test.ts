import { describe, it, expect } from "vitest";
import {
  calcularSlotsDisponibles,
  calcularSlotsDetallados,
  horaAMinutos,
  minutosAHora,
  HorarioAtencionDia,
  LunchBreak,
  CitaOcupada,
} from "./motorDisponibilidad";

describe("Motor de Slots de Disponibilidad - Dominio Puro", () => {
  describe("Utilidades de conversión de hora", () => {
    it("convierte string 'HH:MM' a minutos desde medianoche", () => {
      expect(horaAMinutos("00:00")).toBe(0);
      expect(horaAMinutos("09:00")).toBe(540);
      expect(horaAMinutos("14:30")).toBe(870);
      expect(horaAMinutos("23:59")).toBe(1439);
    });

    it("convierte número o Date a minutos", () => {
      expect(horaAMinutos(600)).toBe(600);

      const fechaUtc = new Date("2026-10-15T10:30:00Z");
      expect(horaAMinutos(fechaUtc)).toBe(630);

      const fechaIsoString = "2026-10-15T15:45:00Z";
      expect(horaAMinutos(fechaIsoString)).toBe(945);
    });

    it("convierte minutos a string 'HH:MM' con padding de ceros", () => {
      expect(minutosAHora(0)).toBe("00:00");
      expect(minutosAHora(540)).toBe("09:00");
      expect(minutosAHora(870)).toBe("14:30");
      expect(minutosAHora(1080)).toBe("18:00");
    });
  });

  describe("1. Días cerrados y validación de jornada laboral", () => {
    it("retorna array vacío si el horario de atención es null o undefined", () => {
      expect(
        calcularSlotsDisponibles({
          horarioAtencion: null,
          duracionServicioMin: 30,
        })
      ).toEqual([]);

      expect(
        calcularSlotsDisponibles({
          horarioAtencion: undefined,
          duracionServicioMin: 30,
        })
      ).toEqual([]);
    });

    it("retorna array vacío si el día está marcado como no activo (activo: false)", () => {
      const horarioCerrado: HorarioAtencionDia = {
        abre: "09:00",
        cierra: "18:00",
        activo: false,
      };

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horarioCerrado,
        duracionServicioMin: 30,
      });

      expect(slots).toEqual([]);
    });

    it("retorna array vacío si la hora de apertura es igual o posterior a la de cierre", () => {
      expect(
        calcularSlotsDisponibles({
          horarioAtencion: { abre: "18:00", cierra: "18:00", activo: true },
          duracionServicioMin: 30,
        })
      ).toEqual([]);

      expect(
        calcularSlotsDisponibles({
          horarioAtencion: { abre: "19:00", cierra: "09:00", activo: true },
          duracionServicioMin: 30,
        })
      ).toEqual([]);
    });

    it("retorna array vacío si la duración del servicio es menor o igual a cero", () => {
      const horario: HorarioAtencionDia = {
        abre: "09:00",
        cierra: "18:00",
        activo: true,
      };

      expect(
        calcularSlotsDisponibles({
          horarioAtencion: horario,
          duracionServicioMin: 0,
        })
      ).toEqual([]);

      expect(
        calcularSlotsDisponibles({
          horarioAtencion: horario,
          duracionServicioMin: -30,
        })
      ).toEqual([]);
    });

    it("retorna array vacío si la duración del servicio excede la duración total de la jornada", () => {
      const horarioCorto: HorarioAtencionDia = {
        abre: "09:00",
        cierra: "11:00", // 2 horas = 120 min
        activo: true,
      };

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horarioCorto,
        duracionServicioMin: 150, // 2h 30m
      });

      expect(slots).toEqual([]);
    });
  });

  describe("2. Citas existentes que ocupan slots", () => {
    const horario: HorarioAtencionDia = {
      abre: "09:00",
      cierra: "13:00",
      activo: true,
    };

    it("calcula todos los slots en una jornada limpia sin citas agendadas", () => {
      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        pasoMin: 30,
      });

      expect(slots).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
      ]);
    });

    it("excluye el slot exacto que coincide con una cita existente", () => {
      const citas: CitaOcupada[] = [{ inicio: "10:00", fin: "10:30" }];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots).toEqual([
        "09:00",
        "09:30",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
      ]);
      expect(slots).not.toContain("10:00");
    });

    it("excluye múltiples slots consecutivos ocupados por una cita larga", () => {
      // Cita de 10:00 a 11:30 (bloquea 10:00, 10:30 y 11:00 para servicio de 30m)
      const citas: CitaOcupada[] = [{ inicio: "10:00", fin: "11:30" }];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots).toEqual([
        "09:00",
        "09:30",
        "11:30",
        "12:00",
        "12:30",
      ]);
    });

    it("excluye el primer slot cuando hay cita a la hora de apertura", () => {
      const citas: CitaOcupada[] = [{ inicio: "09:00", fin: "09:30" }];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots[0]).toBe("09:30");
      expect(slots).not.toContain("09:00");
    });

    it("excluye el último slot cuando hay cita previa al cierre", () => {
      const citas: CitaOcupada[] = [{ inicio: "12:30", fin: "13:00" }];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots[slots.length - 1]).toBe("12:00");
      expect(slots).not.toContain("12:30");
    });

    it("ignora citas con estado 'cancelada' o 'cancelado' sin bloquear slots", () => {
      const citas: CitaOcupada[] = [
        { inicio: "10:00", fin: "10:30", estado: "cancelada" },
        { inicio: "11:00", fin: "11:30", estado: "cancelado" },
        { inicio: "12:00", fin: "12:30", estado: "confirmada" }, // Esta sí bloquea
      ];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots).toContain("10:00");
      expect(slots).toContain("11:00");
      expect(slots).not.toContain("12:00");
    });
  });

  describe("3. Descansos a mediodía (Lunch break y pausas)", () => {
    const horarioCompleto: HorarioAtencionDia = {
      abre: "09:00",
      cierra: "18:00",
      activo: true,
    };

    const lunch: LunchBreak = {
      inicio: "14:00",
      fin: "15:00",
    };

    it("bloquea slots dentro del descanso y permite los contiguos que no se solapan", () => {
      const slots = calcularSlotsDisponibles({
        horarioAtencion: horarioCompleto,
        duracionServicioMin: 30,
        lunchBreak: lunch,
        pasoMin: 30,
      });

      // 13:30 a 14:00 termina exactamente cuando inicia el almuerzo -> disponible
      expect(slots).toContain("13:30");

      // 14:00 y 14:30 caen dentro del almuerzo -> bloqueados
      expect(slots).not.toContain("14:00");
      expect(slots).not.toContain("14:30");

      // 15:00 inicia exactamente cuando termina el almuerzo -> disponible
      expect(slots).toContain("15:00");
    });

    it("bloquea un servicio largo que iniciaría antes del almuerzo pero terminaría dentro de él", () => {
      // Servicio de 60 min con paso de 30 min
      const slots = calcularSlotsDisponibles({
        horarioAtencion: horarioCompleto,
        duracionServicioMin: 60,
        lunchBreak: lunch,
        pasoMin: 30,
      });

      // 13:00 a 14:00 cabe perfectamente antes del almuerzo
      expect(slots).toContain("13:00");

      // 13:30 a 14:30 invadiría la primera media hora del almuerzo -> bloqueado
      expect(slots).not.toContain("13:30");

      // 14:00 y 14:30 caen en el almuerzo -> bloqueados
      expect(slots).not.toContain("14:00");
      expect(slots).not.toContain("14:30");

      // 15:00 a 16:00 inicia justo al terminar el almuerzo
      expect(slots).toContain("15:00");
    });

    it("soporta descansos múltiples (ej. coffee break y lunch break)", () => {
      const descansoCafe: LunchBreak = { inicio: "11:00", fin: "11:30" };
      const descansoAlmuerzo: LunchBreak = { inicio: "14:00", fin: "15:00" };

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horarioCompleto,
        duracionServicioMin: 30,
        descansos: [descansoCafe, descansoAlmuerzo],
        pasoMin: 30,
      });

      expect(slots).toContain("10:30");
      expect(slots).not.toContain("11:00");
      expect(slots).toContain("11:30");

      expect(slots).toContain("13:30");
      expect(slots).not.toContain("14:00");
      expect(slots).not.toContain("14:30");
      expect(slots).toContain("15:00");
    });
  });

  describe("4. Servicios largos que cruzan horas", () => {
    const horario: HorarioAtencionDia = {
      abre: "09:00",
      cierra: "13:00",
      activo: true,
    };

    it("evalúa correctamente servicios de 60 minutos con paso de 30 minutos", () => {
      // 09:00 a 13:00 = 4 horas
      // Slots posibles de 60 min: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00
      // 12:30 terminaría a las 13:30 (después de cierra) -> no cabe
      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 60,
        pasoMin: 30,
      });

      expect(slots).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
      ]);
    });

    it("bloquea slots de servicio de 60 minutos que cruzan una cita de 30 minutos", () => {
      // Cita existente de 10:30 a 11:00
      // Para servicio de 60m:
      // 09:30 a 10:30 -> libre (termina justo cuando inicia la cita)
      // 10:00 a 11:00 -> choca con la cita de 10:30 a 11:00
      // 10:30 a 11:30 -> choca con la cita de 10:30 a 11:00
      // 11:00 a 12:00 -> libre (inicia justo cuando termina la cita)
      const citas: CitaOcupada[] = [{ inicio: "10:30", fin: "11:00" }];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 60,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots).toContain("09:30");
      expect(slots).not.toContain("10:00");
      expect(slots).not.toContain("10:30");
      expect(slots).toContain("11:00");
    });

    it("evalúa servicios extra largos de 90 y 120 minutos", () => {
      // Servicio de 90 min (1h 30m)
      const slots90 = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 90,
        pasoMin: 30,
      });
      // 09:00 (hasta 10:30), 09:30 (hasta 11:00), 10:00 (hasta 11:30), 10:30 (hasta 12:00), 11:00 (hasta 12:30), 11:30 (hasta 13:00)
      expect(slots90).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
      ]);

      // Servicio de 120 min (2h)
      const slots120 = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 120,
        pasoMin: 60,
      });
      // Con paso de 60 min: 09:00 (hasta 11:00), 10:00 (hasta 12:00), 11:00 (hasta 13:00)
      expect(slots120).toEqual(["09:00", "10:00", "11:00"]);
    });

    it("impide agendar un servicio largo si el espacio entre dos citas es menor a la duración", () => {
      // Jornada 09:00 a 13:00
      // Cita 1: 09:30 a 10:00
      // Cita 2: 10:45 a 11:30
      // Espacio entre citas: 10:00 a 10:45 (45 minutos)
      // Servicio de 60 min: NO cabe en ese hueco de 45 min
      const citas: CitaOcupada[] = [
        { inicio: "09:30", fin: "10:00" },
        { inicio: "10:45", fin: "11:30" },
      ];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 60,
        citasExistentes: citas,
        pasoMin: 15,
      });

      expect(slots).not.toContain("10:00");
      expect(slots).not.toContain("10:15");
      expect(slots).not.toContain("10:30");
      expect(slots).toContain("11:30"); // 11:30 a 12:30 cabe
    });
  });

  describe("5. Límites de jornada laboral (Apertura y Cierre)", () => {
    it("asegura que ningún slot inicie antes de la apertura y ninguno termine tras el cierre", () => {
      const horario: HorarioAtencionDia = {
        abre: "08:00",
        cierra: "12:00",
        activo: true,
      };

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 45,
        pasoMin: 30,
      });

      // 08:00 a 08:45 (ok)
      // 08:30 a 09:15 (ok)
      // 09:00 a 09:45 (ok)
      // 09:30 a 10:15 (ok)
      // 10:00 a 10:45 (ok)
      // 10:30 a 11:15 (ok)
      // 11:00 a 11:45 (ok)
      // 11:30 a 12:15 (> 12:00, no cabe)
      expect(slots[0]).toBe("08:00");
      expect(slots[slots.length - 1]).toBe("11:00");
      expect(slots).not.toContain("11:30");
    });

    it("permite un único slot cuando la duración del servicio es idéntica a la jornada completa", () => {
      const horario: HorarioAtencionDia = {
        abre: "10:00",
        cierra: "12:00", // 120 minutos
        activo: true,
      };

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 120,
        pasoMin: 30,
      });

      expect(slots).toEqual(["10:00"]);
    });
  });

  describe("6. Buffer de preparación y limpieza entre citas", () => {
    const horario: HorarioAtencionDia = {
      abre: "09:00",
      cierra: "13:00",
      activo: true,
    };

    it("reserva tiempo de buffer posterior al servicio evitando colisiones inmediatas", () => {
      // Servicio de 30 min + 15 min de buffer = 45 min ocupados
      // Cita existente a las 09:00 a 09:30 con 15 min de buffer -> bloquea 09:00 y 09:30 (buffer dura hasta 09:45)
      // Slot 10:00 inicia después de 09:45 -> disponible
      // Slot 10:30 ocuparía hasta 11:00 de servicio + 15 min buffer hasta 11:15 -> choca con cita de 11:00
      // Cita de 11:00 a 11:30 tiene buffer hasta 11:45
      // Slot 11:30 choca con el buffer de la cita -> bloqueado
      // Slot 12:00 inicia después del buffer de la cita -> disponible
      const citas: CitaOcupada[] = [
        { inicio: "09:00", fin: "09:30" },
        { inicio: "11:00", fin: "11:30" },
      ];

      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        bufferPreparacionMin: 15,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(slots).not.toContain("09:00"); // Ocupado por cita
      expect(slots).not.toContain("09:30"); // Bloqueado por buffer de la cita de 09:00
      expect(slots).toContain("10:00");
      expect(slots).not.toContain("10:30"); // Su buffer (11:00-11:15) choca con cita de 11:00
      expect(slots).not.toContain("11:00"); // Ocupado por cita
      expect(slots).not.toContain("11:30"); // Bloqueado por buffer de la cita de 11:00
      expect(slots).toContain("12:00");
    });

    it("respeta configuración de buffer previo (antesMin) y posterior (despuesMin)", () => {
      // Buffer: 10 min antes, 10 min después
      // A las 09:00 el servicio necesitaría preparación desde las 08:50 (antes de apertura 09:00) -> bloqueado
      // A las 09:30 requiere 09:20 (dentro de apertura) -> disponible
      const slots = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        bufferPreparacionMin: { antesMin: 10, despuesMin: 10 },
        pasoMin: 30,
      });

      expect(slots).not.toContain("09:00"); // No cabe preparación antes de apertura
      expect(slots).toContain("09:30");
    });

    it("aplica bufferIncluidoEnJornada para exigir que el buffer finalice antes del cierre", () => {
      const horarioTarde: HorarioAtencionDia = {
        abre: "16:00",
        cierra: "18:00",
        activo: true,
      };

      // Servicio de 30 min, buffer 15 min
      // Slot 17:30 a 18:00: servicio termina a las 18:00, buffer terminaría a las 18:15 (> 18:00)
      const slotsConBufferEnJornada = calcularSlotsDisponibles({
        horarioAtencion: horarioTarde,
        duracionServicioMin: 30,
        bufferPreparacionMin: 15,
        bufferIncluidoEnJornada: true,
        pasoMin: 30,
      });

      expect(slotsConBufferEnJornada).not.toContain("17:30");
      expect(slotsConBufferEnJornada).toContain("17:00");

      // Sin exigir buffer dentro de jornada (default: servicio termina antes de cierra)
      const slotsDefault = calcularSlotsDisponibles({
        horarioAtencion: horarioTarde,
        duracionServicioMin: 30,
        bufferPreparacionMin: 15,
        bufferIncluidoEnJornada: false,
        pasoMin: 30,
      });

      expect(slotsDefault).toContain("17:30");
    });
  });

  describe("7. Sobrecarga posicional y paso configurable", () => {
    it("funciona con firma posicional manteniendo retrocompatibilidad", () => {
      const horario: HorarioAtencionDia = {
        abre: "09:00",
        cierra: "11:00",
        activo: true,
      };

      const citas: CitaOcupada[] = [{ inicio: "09:30", fin: "10:00" }];
      const lunch: LunchBreak = { inicio: "12:00", fin: "13:00" };

      const slots = calcularSlotsDisponibles(
        horario,
        30, // duracion
        0, // buffer
        lunch,
        citas,
        30 // paso
      );

      expect(slots).toEqual(["09:00", "10:00", "10:30"]);
    });

    it("permite pasos personalizados de 15 minutos o 60 minutos", () => {
      const horario: HorarioAtencionDia = {
        abre: "09:00",
        cierra: "10:00",
        activo: true,
      };

      const slots15 = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 15,
        pasoMin: 15,
      });
      expect(slots15).toEqual(["09:00", "09:15", "09:30", "09:45"]);

      const slots60 = calcularSlotsDisponibles({
        horarioAtencion: horario,
        duracionServicioMin: 60,
        pasoMin: 60,
      });
      expect(slots60).toEqual(["09:00"]);
    });
  });

  describe("8. Función detallada calcularSlotsDetallados", () => {
    it("devuelve objetos con estado de disponibilidad", () => {
      const horario: HorarioAtencionDia = {
        abre: "09:00",
        cierra: "11:00",
        activo: true,
      };

      const citas: CitaOcupada[] = [{ inicio: "09:30", fin: "10:00" }];

      const detallados = calcularSlotsDetallados({
        horarioAtencion: horario,
        duracionServicioMin: 30,
        citasExistentes: citas,
        pasoMin: 30,
      });

      expect(detallados).toHaveLength(4);
      expect(detallados[0]).toEqual({
        horaInicio: "09:00",
        horaFin: "09:30",
        inicioMin: 540,
        finMin: 570,
        disponible: true,
      });
      expect(detallados[1]).toEqual({
        horaInicio: "09:30",
        horaFin: "10:00",
        inicioMin: 570,
        finMin: 600,
        disponible: false, // Ocupado por cita
      });
      expect(detallados[2].disponible).toBe(true);
      expect(detallados[3].disponible).toBe(true);
    });
  });
});
