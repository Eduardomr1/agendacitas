import { describe, expect, it } from "vitest";
import {
  MotorRecordatoriosNoShow,
  PlanificarRecordatoriosCitaUseCase,
} from "../../index";

describe("PlanificarRecordatoriosCitaUseCase", () => {
  const useCase = new PlanificarRecordatoriosCitaUseCase();

  it("orquesta la planificación de recordatorios y el despacho idempotente vía barrel público", () => {
    expect(MotorRecordatoriosNoShow).toBeDefined();

    const plan = useCase.execute({
      negocioId: "neg-77",
      citaId: "cita-900",
      inicioCita: new Date("2026-12-05T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 65_000,
      anticipoPagadoCentavos: 0,
      historialCliente: {
        totalCitasPrevias: 4,
        noShowsPrevios: 2,
        ultimoNoShowHaceDias: 12,
        cancelacionesTardiasPrevias: 1,
      },
      offsetMinutosZonaHoraria: 0,
    });

    expect(plan.evaluacionRiesgo.nivelRiesgo).toBe("CRITICO");
    expect(plan.recordatoriosProgramados).toHaveLength(4);
    expect(plan.accionVencimientoConfirmacion).toBe("LIBERAR_A_LISTA_ESPERA");

    const despacho = useCase.evaluarDespacho({
      negocioId: "neg-77",
      plan,
      ahora: new Date("2026-12-04T16:30:00Z"),
      estadoCita: "pendiente",
      confirmadaPorCliente: false,
      idsYaEnviados: ["cita-900:RECORDATORIO_72H"],
    });

    expect(despacho.listosParaEnviar.map((r) => r.codigoRegla)).toEqual([
      "CONFIRMACION_36H",
    ]);
    expect(despacho.confirmacionVencida).toBe(true);
    expect(despacho.accionRecomendada).toBe("LIBERAR_A_LISTA_ESPERA");
  });

  it("utiliza 'ahora' por defecto para fechaCreacionReserva cuando se omite", () => {
    const ahora = new Date("2026-11-25T12:00:00Z");
    const plan = useCase.execute({
      negocioId: "neg-77",
      citaId: "cita-901",
      inicioCita: new Date("2026-11-25T16:00:00Z"), // 4h después
      ahora,
      precioTotalCentavos: 25_000,
    });

    expect(plan.evaluacionRiesgo.nivelRiesgo).toBe("BAJO");
    expect(plan.evaluacionRiesgo.factores.map((f) => f.codigo)).toContain(
      "RESERVA_INMEDIATA"
    );
  });

  it("rechaza negocioId vacío, citaId vacío, fechas inválidas, montos inválidos y política incoherente", () => {
    const base = {
      negocioId: "neg-1",
      citaId: "cita-1",
      inicioCita: new Date("2026-11-28T16:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 20_000,
    };

    expect(() => useCase.execute({ ...base, negocioId: "   " })).toThrow(
      /negocioId/
    );
    expect(() => useCase.execute({ ...base, citaId: "" })).toThrow(/citaId/);
    expect(() =>
      useCase.execute({ ...base, inicioCita: new Date("invalid") })
    ).toThrow(/inicio de la cita/);
    expect(() =>
      useCase.execute({ ...base, ahora: new Date("invalid") })
    ).toThrow(/ahora/);
    expect(() =>
      useCase.execute({ ...base, precioTotalCentavos: 199.5 })
    ).toThrow(/precio total/);
    expect(() =>
      useCase.execute({ ...base, anticipoPagadoCentavos: 25_000 })
    ).toThrow(/anticipo pagado/);
    expect(() =>
      useCase.execute({
        ...base,
        politica: {
          ventanaSilencio: {
            activa: true,
            inicioHora: "25:99",
            finHora: "08:00",
          },
        },
      })
    ).toThrow(/HH:MM/);
  });

  it("valida contratos de entrada en evaluarDespacho", () => {
    const plan = useCase.execute({
      negocioId: "neg-1",
      citaId: "cita-902",
      inicioCita: new Date("2026-11-28T16:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 20_000,
    });

    expect(() =>
      useCase.evaluarDespacho({
        negocioId: "",
        plan,
        ahora: new Date("2026-11-27T17:00:00Z"),
        estadoCita: "confirmada",
        confirmadaPorCliente: false,
      })
    ).toThrow(/negocioId/);

    expect(() =>
      useCase.evaluarDespacho({
        negocioId: "neg-1",
        plan,
        ahora: new Date("2026-11-27T17:00:00Z"),
        estadoCita: "  ",
        confirmadaPorCliente: false,
      })
    ).toThrow(/estadoCita/);

    expect(() =>
      useCase.evaluarDespacho({
        negocioId: "neg-1",
        plan,
        ahora: new Date("invalid"),
        estadoCita: "confirmada",
        confirmadaPorCliente: false,
      })
    ).toThrow(/ahora/);
  });
});
