import { describe, it, expect } from "vitest";
import {
  POLITICA_CANCELACION_POR_DEFECTO,
  PoliticaCancelacionConfig,
  CitaEvaluacionPolitica,
  validarConfiguracionPolitica,
  calcularFechaLimiteCancelacionGratuita,
  evaluarCancelacionCita,
  evaluarElegibilidadReprogramacion,
} from "./politicasCancelacion";

describe("politicasCancelacion — Motor puro de dominio", () => {
  const citaBase: CitaEvaluacionPolitica = {
    id: "cita-101",
    inicio: new Date("2026-10-25T16:00:00Z"),
    fin: new Date("2026-10-25T17:00:00Z"),
    estado: "confirmada",
    precioCentavos: 50000, // $500.00 MXN
    reprogramacionesRealizadas: 0,
  };

  describe("validarConfiguracionPolitica", () => {
    it("aprueba la configuración por defecto sin errores", () => {
      const resultado = validarConfiguracionPolitica(POLITICA_CANCELACION_POR_DEFECTO);
      expect(resultado.valido).toBe(true);
      expect(resultado.errores).toEqual([]);
    });

    it("detecta inconsistencias en horas, porcentajes, enteros y tramos duplicados", () => {
      const invalida: PoliticaCancelacionConfig = {
        horasAnticipacionGratuita: 6,
        horasMinimasCancelacion: 12, // Mayor que anticipación gratuita
        porcentajePenalizacionTardia: 120, // > 100
        horasMinimasReprogramacion: -2,
        maxReprogramacionesPermitidas: 1.5, // No entero
        tramosPenalizacion: [
          { horasAntesMin: 4, porcentajeCargo: 25 },
          { horasAntesMin: 4, porcentajeCargo: 50 }, // Duplicado
        ],
      };

      const resultado = validarConfiguracionPolitica(invalida);
      expect(resultado.valido).toBe(false);
      expect(resultado.errores.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("evaluarCancelacionCita", () => {
    it("permite cancelación 100% gratuita en y antes del límite de anticipación gratuita", () => {
      const limiteExacto = calcularFechaLimiteCancelacionGratuita(citaBase.inicio, 24);
      expect(limiteExacto.toISOString()).toBe("2026-10-24T16:00:00.000Z");

      const evaluacion = evaluarCancelacionCita(
        citaBase,
        POLITICA_CANCELACION_POR_DEFECTO,
        limiteExacto
      );

      expect(evaluacion.permitida).toBe(true);
      expect(evaluacion.esGratuita).toBe(true);
      expect(evaluacion.porcentajePenalizacion).toBe(0);
      expect(evaluacion.montoPenalizacionCentavos).toBe(0);
      expect(evaluacion.montoReembolsoCentavos).toBe(50000);
    });

    it("aplica penalización tardía por defecto cuando se cancela dentro de la ventana penalizable", () => {
      const diezHorasAntes = new Date("2026-10-25T06:00:00Z");
      const evaluacion = evaluarCancelacionCita(
        citaBase,
        POLITICA_CANCELACION_POR_DEFECTO,
        diezHorasAntes
      );

      expect(evaluacion.permitida).toBe(true);
      expect(evaluacion.esGratuita).toBe(false);
      expect(evaluacion.porcentajePenalizacion).toBe(50);
      expect(evaluacion.montoPenalizacionCentavos).toBe(25000);
      expect(evaluacion.montoReembolsoCentavos).toBe(25000);
    });

    it("aplica tramos escalonados de penalización conservando exactitud entera en centavos", () => {
      const politicaEscalonada: PoliticaCancelacionConfig = {
        ...POLITICA_CANCELACION_POR_DEFECTO,
        horasAnticipacionGratuita: 24,
        porcentajePenalizacionTardia: 80, // < 4h
        tramosPenalizacion: [
          { horasAntesMin: 4, porcentajeCargo: 50 },
          { horasAntesMin: 12, porcentajeCargo: 25 },
        ],
      };

      const citaPrecioImpar: CitaEvaluacionPolitica = {
        ...citaBase,
        precioCentavos: 3550, // $35.50
      };

      // Faltando 15 horas -> aplica tramo >= 12h (25% de 3550 = 887.5 -> 888)
      const eval15h = evaluarCancelacionCita(
        citaPrecioImpar,
        politicaEscalonada,
        new Date("2026-10-25T01:00:00Z")
      );
      expect(eval15h.porcentajePenalizacion).toBe(25);
      expect(eval15h.montoPenalizacionCentavos).toBe(888);
      expect(eval15h.montoReembolsoCentavos).toBe(2662);
      expect(eval15h.montoPenalizacionCentavos + eval15h.montoReembolsoCentavos).toBe(
        3550
      );

      // Faltando 6 horas -> aplica tramo >= 4h (50%)
      const eval6h = evaluarCancelacionCita(
        citaBase,
        politicaEscalonada,
        new Date("2026-10-25T10:00:00Z")
      );
      expect(eval6h.porcentajePenalizacion).toBe(50);

      // Faltando 3 horas -> cae al fallback porcentajePenalizacionTardia (80%)
      const eval3h = evaluarCancelacionCita(
        citaBase,
        politicaEscalonada,
        new Date("2026-10-25T13:00:00Z")
      );
      expect(eval3h.porcentajePenalizacion).toBe(80);
      expect(eval3h.montoPenalizacionCentavos).toBe(40000);
      expect(eval3h.montoReembolsoCentavos).toBe(10000);
    });

    it("bloquea la cancelación en línea cuando bloquearCancelacionTardia es true y se cruza la ventana mínima", () => {
      const politicaEstricta: PoliticaCancelacionConfig = {
        ...POLITICA_CANCELACION_POR_DEFECTO,
        horasMinimasCancelacion: 3,
        bloquearCancelacionTardia: true,
      };

      const dosHorasAntes = new Date("2026-10-25T14:00:00Z");
      const evaluacion = evaluarCancelacionCita(
        citaBase,
        politicaEstricta,
        dosHorasAntes
      );

      expect(evaluacion.permitida).toBe(false);
      expect(evaluacion.motivoRechazo).toBe("DENTRO_VENTANA_BLOQUEO");
      expect(evaluacion.porcentajePenalizacion).toBe(100);
      expect(evaluacion.montoReembolsoCentavos).toBe(0);
    });

    it("rechaza cancelaciones de citas ya canceladas, completadas o que ya iniciaron", () => {
      const ahoraPrevio = new Date("2026-10-24T10:00:00Z");

      const evalCancelada = evaluarCancelacionCita(
        { ...citaBase, estado: "cancelada" },
        POLITICA_CANCELACION_POR_DEFECTO,
        ahoraPrevio
      );
      expect(evalCancelada.permitida).toBe(false);
      expect(evalCancelada.motivoRechazo).toBe("CITA_YA_CANCELADA");

      const evalCompletada = evaluarCancelacionCita(
        { ...citaBase, estado: "completada" },
        POLITICA_CANCELACION_POR_DEFECTO,
        ahoraPrevio
      );
      expect(evalCompletada.permitida).toBe(false);
      expect(evalCompletada.motivoRechazo).toBe("CITA_COMPLETADA");

      const evalPasada = evaluarCancelacionCita(
        citaBase,
        POLITICA_CANCELACION_POR_DEFECTO,
        new Date("2026-10-25T16:00:00Z")
      );
      expect(evalPasada.permitida).toBe(false);
      expect(evalPasada.motivoRechazo).toBe("CITA_PASADA_O_EN_CURSO");
    });
  });

  describe("evaluarElegibilidadReprogramacion", () => {
    it("autoriza reprogramación dentro del plazo y contabiliza cambios restantes", () => {
      const evaluacion = evaluarElegibilidadReprogramacion(
        { ...citaBase, reprogramacionesRealizadas: 1 },
        POLITICA_CANCELACION_POR_DEFECTO,
        new Date("2026-10-25T10:00:00Z"), // 6h antes >= 4h requeridas
        new Date("2026-10-26T12:00:00Z")
      );

      expect(evaluacion.elegible).toBe(true);
      expect(evaluacion.reprogramacionesRestantes).toBe(1);
      expect(evaluacion.motivoRechazo).toBeUndefined();
    });

    it("rechaza con LIMITE_REPROGRAMACIONES_ALCANZADO al agotar el cupo de cambios", () => {
      const evaluacion = evaluarElegibilidadReprogramacion(
        { ...citaBase, reprogramacionesRealizadas: 2 },
        POLITICA_CANCELACION_POR_DEFECTO,
        new Date("2026-10-24T10:00:00Z")
      );

      expect(evaluacion.elegible).toBe(false);
      expect(evaluacion.reprogramacionesRestantes).toBe(0);
      expect(evaluacion.motivoRechazo).toBe("LIMITE_REPROGRAMACIONES_ALCANZADO");
    });

    it("rechaza por ventana mínima insuficiente, mismo horario original o estado inactivo", () => {
      const fueraVentana = evaluarElegibilidadReprogramacion(
        citaBase,
        POLITICA_CANCELACION_POR_DEFECTO,
        new Date("2026-10-25T13:30:00Z") // 2.5h < 4h
      );
      expect(fueraVentana.elegible).toBe(false);
      expect(fueraVentana.motivoRechazo).toBe("FUERA_DE_VENTANA_MINIMA");

      const mismoHorario = evaluarElegibilidadReprogramacion(
        citaBase,
        POLITICA_CANCELACION_POR_DEFECTO,
        new Date("2026-10-24T10:00:00Z"),
        new Date("2026-10-25T16:00:00Z")
      );
      expect(mismoHorario.elegible).toBe(false);
      expect(mismoHorario.motivoRechazo).toBe("MISMO_HORARIO_ORIGINAL");

      const noActiva = evaluarElegibilidadReprogramacion(
        { ...citaBase, estado: "cancelada" },
        POLITICA_CANCELACION_POR_DEFECTO,
        new Date("2026-10-24T10:00:00Z")
      );
      expect(noActiva.elegible).toBe(false);
      expect(noActiva.motivoRechazo).toBe("CITA_NO_ACTIVA");
    });
  });
});
