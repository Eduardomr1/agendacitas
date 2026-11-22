import { describe, expect, it } from "vitest";
import {
  calcularBalanceLibroCreditos,
  calcularResumenBilleteraCliente,
  calcularSesionesDisponibles,
  calcularValorReembolsoProrrateado,
  conciliarPaqueteConLibro,
  ejecutarCanjeSesion,
  evaluarElegibilidadCanje,
  obtenerEstadoEfectivoPaquete,
  revertirCanjeSesion,
  seleccionarMejorPaqueteParaReserva,
  validarPaqueteSesiones,
  type MovimientoCreditoPaquete,
  type PaqueteSesionesCliente,
} from "./paquetesSesiones";

function crearPaqueteBase(
  overrides: Partial<PaqueteSesionesCliente> = {}
): PaqueteSesionesCliente {
  return {
    id: "paq-1",
    negocioId: "neg-spa",
    clienteId: "cli-ana",
    nombre: "Bono 5 Masajes Terapéuticos",
    sesionesTotales: 5,
    sesionesConsumidas: 2,
    serviciosCubiertosIds: ["srv-masaje", "srv-facial"],
    fechaCompra: new Date("2026-10-01T10:00:00Z"),
    fechaExpiracion: new Date("2026-12-31T23:59:59Z"),
    estado: "ACTIVO",
    valorUnitarioCentavos: 45_000,
    ...overrides,
  };
}

describe("paquetesSesiones - validación y estados efectivos", () => {
  it("valida invariantes estructurales y rechaza sobre-consumo o fechas incoherentes", () => {
    expect(validarPaqueteSesiones(crearPaqueteBase()).valido).toBe(true);

    const invalido = validarPaqueteSesiones(
      crearPaqueteBase({
        id: " ",
        sesionesTotales: 0,
        sesionesConsumidas: 3,
        valorUnitarioCentavos: -100,
        serviciosCubiertosIds: [],
        fechaExpiracion: new Date("2026-09-01T00:00:00Z"),
      })
    );

    expect(invalido.valido).toBe(false);
    expect(invalido.errores.length).toBeGreaterThanOrEqual(5);
  });

  it("calcula sesiones disponibles sin valores negativos y detecta expiración/agotamiento", () => {
    const ahora = new Date("2026-11-22T12:00:00Z");
    const activo = crearPaqueteBase();
    expect(calcularSesionesDisponibles(activo)).toBe(3);
    expect(obtenerEstadoEfectivoPaquete(activo, ahora)).toBe("ACTIVO");

    const agotadoPorSaldo = crearPaqueteBase({ sesionesConsumidas: 5 });
    expect(obtenerEstadoEfectivoPaquete(agotadoPorSaldo, ahora)).toBe("AGOTADO");

    const enLimiteExpiracion = crearPaqueteBase({
      fechaExpiracion: new Date("2026-11-22T12:00:00Z"),
    });
    expect(obtenerEstadoEfectivoPaquete(enLimiteExpiracion, ahora)).toBe("ACTIVO");

    const expirado = crearPaqueteBase({
      fechaExpiracion: new Date("2026-11-22T11:59:59Z"),
    });
    expect(obtenerEstadoEfectivoPaquete(expirado, ahora)).toBe("EXPIRADO");

    const corrupto = crearPaqueteBase({ sesionesConsumidas: -2 });
    expect(calcularSesionesDisponibles(corrupto)).toBe(0);
  });
});

describe("paquetesSesiones - elegibilidad y prevención de sobre-canje", () => {
  const ahora = new Date("2026-11-22T12:00:00Z");

  it("aprueba canje válido y calcula el saldo restante y valor en centavos", () => {
    const res = evaluarElegibilidadCanje({
      paquete: crearPaqueteBase({ sesionesTotales: 5, sesionesConsumidas: 2 }),
      servicioId: "srv-masaje",
      clienteId: "cli-ana",
      negocioId: "neg-spa",
      sesionesRequeridas: 2,
      ahora,
    });

    expect(res.elegible).toBe(true);
    expect(res.sesionesDisponibles).toBe(3);
    expect(res.sesionesRestantesDespues).toBe(1);
    expect(res.valorCanjeCentavos).toBe(90_000);
  });

  it("bloquea canjes negativos, cero, fraccionarios y sobre-canjes", () => {
    const paquete = crearPaqueteBase({ sesionesTotales: 4, sesionesConsumidas: 3 });

    const cero = evaluarElegibilidadCanje({
      paquete,
      servicioId: "srv-masaje",
      sesionesRequeridas: 0,
      ahora,
    });
    expect(cero.elegible).toBe(false);
    expect(cero.motivoRechazo).toBe("CANTIDAD_SESIONES_INVALIDA");

    const negativo = evaluarElegibilidadCanje({
      paquete,
      servicioId: "srv-masaje",
      sesionesRequeridas: -1,
      ahora,
    });
    expect(negativo.elegible).toBe(false);
    expect(negativo.motivoRechazo).toBe("CANTIDAD_SESIONES_INVALIDA");

    const sobreCanje = evaluarElegibilidadCanje({
      paquete,
      servicioId: "srv-masaje",
      sesionesRequeridas: 2,
      ahora,
    });
    expect(sobreCanje.elegible).toBe(false);
    expect(sobreCanje.motivoRechazo).toBe("SESIONES_INSUFICIENTES");
  });

  it("rechaza paquetes pausados, expirados, de otro cliente/negocio, sin cobertura o duplicados", () => {
    expect(
      evaluarElegibilidadCanje({
        paquete: crearPaqueteBase({ estado: "PAUSADO" }),
        servicioId: "srv-masaje",
        ahora,
      }).motivoRechazo
    ).toBe("PAQUETE_PAUSADO");

    expect(
      evaluarElegibilidadCanje({
        paquete: crearPaqueteBase({
          fechaExpiracion: new Date("2026-11-01T00:00:00Z"),
        }),
        servicioId: "srv-masaje",
        ahora,
      }).motivoRechazo
    ).toBe("PAQUETE_EXPIRADO");

    expect(
      evaluarElegibilidadCanje({
        paquete: crearPaqueteBase(),
        servicioId: "srv-laser",
        ahora,
      }).motivoRechazo
    ).toBe("SERVICIO_NO_CUBIERTO");

    expect(
      evaluarElegibilidadCanje({
        paquete: crearPaqueteBase(),
        servicioId: "srv-masaje",
        clienteId: "cli-otro",
        ahora,
      }).motivoRechazo
    ).toBe("CLIENTE_NO_COINCIDE");

    expect(
      evaluarElegibilidadCanje({
        paquete: crearPaqueteBase(),
        servicioId: "srv-masaje",
        negocioId: "neg-otro",
        ahora,
      }).motivoRechazo
    ).toBe("NEGOCIO_NO_COINCIDE");

    expect(
      evaluarElegibilidadCanje({
        paquete: crearPaqueteBase(),
        servicioId: "srv-masaje",
        citaId: "cita-100",
        citasYaCanjeadasIds: ["cita-100"],
        ahora,
      }).motivoRechazo
    ).toBe("CANJE_DUPLICADO");
  });
});

describe("paquetesSesiones - selección FEFO/FIFO, canje inmutable y reversión", () => {
  const ahora = new Date("2026-11-22T12:00:00Z");

  it("prioriza el paquete con expiración más próxima (FEFO) sobre sin expiración y desempata por compra más antigua (FIFO)", () => {
    const sinVencimiento = crearPaqueteBase({
      id: "paq-lifetime",
      fechaCompra: new Date("2026-01-10T10:00:00Z"),
      fechaExpiracion: null,
      sesionesTotales: 10,
      sesionesConsumidas: 1,
    });
    const venceDiciembre = crearPaqueteBase({
      id: "paq-dic",
      fechaCompra: new Date("2026-11-01T10:00:00Z"),
      fechaExpiracion: new Date("2026-12-20T23:59:59Z"),
      sesionesTotales: 5,
      sesionesConsumidas: 0,
    });
    const venceNoviembre = crearPaqueteBase({
      id: "paq-nov",
      fechaCompra: new Date("2026-11-05T10:00:00Z"),
      fechaExpiracion: new Date("2026-11-30T23:59:59Z"),
      sesionesTotales: 5,
      sesionesConsumidas: 3,
    });
    const expirado = crearPaqueteBase({
      id: "paq-exp",
      fechaExpiracion: new Date("2026-11-10T00:00:00Z"),
    });

    const seleccion = seleccionarMejorPaqueteParaReserva({
      paquetes: [sinVencimiento, venceDiciembre, venceNoviembre, expirado],
      servicioId: "srv-masaje",
      ahora,
    });

    expect(seleccion.seleccionado).toBe(true);
    expect(seleccion.paqueteSeleccionado?.id).toBe("paq-nov");
    expect(seleccion.paquetesElegibles.map((p) => p.id)).toEqual([
      "paq-nov",
      "paq-dic",
      "paq-lifetime",
    ]);
    expect(seleccion.paquetesDescartados).toEqual([
      expect.objectContaining({
        paqueteId: "paq-exp",
        motivo: "PAQUETE_EXPIRADO",
      }),
    ]);
  });

  it("desempata FIFO por fechaCompra cuando dos paquetes expiran en la misma fecha", () => {
    const venceIgualReciente = crearPaqueteBase({
      id: "paq-nuevo",
      fechaCompra: new Date("2026-10-15T10:00:00Z"),
      fechaExpiracion: new Date("2026-12-31T23:59:59Z"),
    });
    const venceIgualAntiguo = crearPaqueteBase({
      id: "paq-antiguo",
      fechaCompra: new Date("2026-09-15T10:00:00Z"),
      fechaExpiracion: new Date("2026-12-31T23:59:59Z"),
    });

    const seleccion = seleccionarMejorPaqueteParaReserva({
      paquetes: [venceIgualReciente, venceIgualAntiguo],
      servicioId: "srv-masaje",
      ahora,
    });

    expect(seleccion.paqueteSeleccionado?.id).toBe("paq-antiguo");
  });

  it("ejecuta canje inmutable transicionando a AGOTADO en la última sesión y revierte con seguridad", () => {
    const inicial = crearPaqueteBase({
      sesionesTotales: 3,
      sesionesConsumidas: 2,
      valorUnitarioCentavos: 50_000,
    });

    const canje = ejecutarCanjeSesion({
      paquete: inicial,
      servicioId: "srv-masaje",
      citaId: "cita-99",
      ahora,
    });

    expect(canje.exito).toBe(true);
    expect(inicial.sesionesConsumidas).toBe(2); // Inmutabilidad preservada
    expect(canje.paqueteActualizado?.sesionesConsumidas).toBe(3);
    expect(canje.paqueteActualizado?.estado).toBe("AGOTADO");
    expect(canje.movimientoGenerado).toMatchObject({
      tipo: "CANJE",
      sesionesDelta: -1,
      montoCentavosDelta: -50_000,
      citaId: "cita-99",
    });

    // Reversión al cancelar cita devuelve a ACTIVO
    const reversion = revertirCanjeSesion({
      paquete: canje.paqueteActualizado!,
      citaId: "cita-99",
      ahora,
      sesionesARevertir: 1,
    });
    expect(reversion.exito).toBe(true);
    expect(reversion.paqueteActualizado?.sesionesConsumidas).toBe(2);
    expect(reversion.paqueteActualizado?.estado).toBe("ACTIVO");

    // Previene reversión que provocaría sesionesConsumidas negativas
    const sobreReversion = revertirCanjeSesion({
      paquete: inicial,
      citaId: "cita-99",
      ahora,
      sesionesARevertir: 5,
    });
    expect(sobreReversion.exito).toBe(false);
    expect(sobreReversion.motivoRechazo).toContain("solo se han consumido 2");
  });
});

describe("paquetesSesiones - reembolso prorrateado, billetera y libro de créditos", () => {
  const ahora = new Date("2026-11-22T12:00:00Z");

  it("calcula reembolso prorrateado exacto en centavos con y sin penalización administrativa", () => {
    const paquete = crearPaqueteBase({
      sesionesTotales: 6,
      sesionesConsumidas: 2,
      valorUnitarioCentavos: 40_000,
    });

    const sinPenalizacion = calcularValorReembolsoProrrateado({
      paquete,
      ahora,
    });
    expect(sinPenalizacion.reembolsable).toBe(true);
    expect(sinPenalizacion.sesionesNoUtilizadas).toBe(4);
    expect(sinPenalizacion.valorBrutoNoUtilizadoCentavos).toBe(160_000);
    expect(sinPenalizacion.montoReembolsoNetoCentavos).toBe(160_000);
    expect(sinPenalizacion.porcentajeNoUtilizado).toBe(66.67);

    const conPenalizacion = calcularValorReembolsoProrrateado({
      paquete,
      ahora,
      porcentajePenalizacion: 10, // 16,000
      cargoAdministrativoCentavos: 5_000,
    });
    expect(conPenalizacion.penalizacionCentavos).toBe(21_000);
    expect(conPenalizacion.montoReembolsoNetoCentavos).toBe(139_000);

    // Con precioPagadoTotalCentavos redondeado
    const paqueteCombo = crearPaqueteBase({
      sesionesTotales: 3,
      sesionesConsumidas: 1,
      valorUnitarioCentavos: 33_333,
      precioPagadoTotalCentavos: 100_000,
    });
    const comboReembolso = calcularValorReembolsoProrrateado({
      paquete: paqueteCombo,
      ahora,
    });
    expect(comboReembolso.valorBrutoNoUtilizadoCentavos).toBe(66_666);
  });

  it("deniega reembolso en paquetes agotados o expirados salvo autorización explícita", () => {
    const expirado = crearPaqueteBase({
      sesionesTotales: 5,
      sesionesConsumidas: 1,
      fechaExpiracion: new Date("2026-11-01T00:00:00Z"),
    });

    const rechazado = calcularValorReembolsoProrrateado({
      paquete: expirado,
      ahora,
    });
    expect(rechazado.reembolsable).toBe(false);
    expect(rechazado.motivoNoReembolsable).toBe("PAQUETE_EXPIRADO");
    expect(rechazado.montoReembolsoNetoCentavos).toBe(0);

    const conGracia = calcularValorReembolsoProrrateado({
      paquete: expirado,
      ahora,
      permitirReembolsoSiExpirado: true,
    });
    expect(conGracia.reembolsable).toBe(true);
    expect(conGracia.montoReembolsoNetoCentavos).toBe(180_000);
  });

  it("audita libro de créditos, resume la billetera y concilia discrepancias", () => {
    const paquete = crearPaqueteBase({
      id: "paq-ledger",
      sesionesTotales: 4,
      sesionesConsumidas: 1,
      valorUnitarioCentavos: 30_000,
    });

    const movimientos: MovimientoCreditoPaquete[] = [
      {
        id: "m-1",
        paqueteId: "paq-ledger",
        clienteId: "cli-ana",
        tipo: "COMPRA",
        sesionesDelta: 4,
        montoCentavosDelta: 120_000,
        fecha: new Date("2026-10-01T10:00:00Z"),
        descripcion: "Compra inicial",
      },
      {
        id: "m-2",
        paqueteId: "paq-ledger",
        clienteId: "cli-ana",
        tipo: "CANJE",
        sesionesDelta: -2,
        montoCentavosDelta: -60_000,
        citaId: "cita-1",
        fecha: new Date("2026-10-10T10:00:00Z"),
        descripcion: "Canje doble",
      },
      {
        id: "m-3",
        paqueteId: "paq-ledger",
        clienteId: "cli-ana",
        tipo: "REVERSION_CANJE",
        sesionesDelta: 1,
        montoCentavosDelta: 30_000,
        citaId: "cita-1",
        fecha: new Date("2026-10-11T10:00:00Z"),
        descripcion: "Reversión parcial",
      },
    ];

    const balance = calcularBalanceLibroCreditos(movimientos, "paq-ledger");
    expect(balance.integridadValida).toBe(true);
    expect(balance.sesionesAcreditadas).toBe(4);
    expect(balance.sesionesConsumidasNetas).toBe(1);
    expect(balance.sesionesDisponibles).toBe(3);
    expect(balance.creditoDisponibleCentavos).toBe(90_000);

    const conciliacionOk = conciliarPaqueteConLibro(paquete, movimientos);
    expect(conciliacionOk.conciliado).toBe(true);

    // Libro con sobregiro negativo
    const balanceNegativo = calcularBalanceLibroCreditos([
      ...movimientos,
      {
        id: "m-4",
        paqueteId: "paq-ledger",
        clienteId: "cli-ana",
        tipo: "CANJE",
        sesionesDelta: -4,
        montoCentavosDelta: -120_000,
        fecha: new Date("2026-10-12T10:00:00Z"),
        descripcion: "Sobregiro inválido",
      },
    ]);
    expect(balanceNegativo.integridadValida).toBe(false);
    expect(balanceNegativo.erroresIntegridad.length).toBeGreaterThanOrEqual(2);

    // Resumen consolidado de billetera
    const resumen = calcularResumenBilleteraCliente(
      [
        paquete,
        crearPaqueteBase({
          id: "paq-pausado",
          estado: "PAUSADO",
          sesionesTotales: 2,
          sesionesConsumidas: 0,
          valorUnitarioCentavos: 25_000,
          serviciosCubiertosIds: ["srv-laser"],
        }),
        crearPaqueteBase({
          id: "paq-expirado",
          sesionesTotales: 3,
          sesionesConsumidas: 1,
          valorUnitarioCentavos: 20_000,
          fechaExpiracion: new Date("2026-11-01T00:00:00Z"),
        }),
      ],
      ahora,
      "cli-ana"
    );

    expect(resumen.paquetesActivos).toBe(1);
    expect(resumen.paquetesPausados).toBe(1);
    expect(resumen.paquetesExpirados).toBe(1);
    expect(resumen.sesionesDisponiblesActivas).toBe(3);
    expect(resumen.creditoDisponibleActivoCentavos).toBe(90_000);
    expect(resumen.creditoPausadoCentavos).toBe(50_000);
    expect(resumen.creditoExpiradoCentavos).toBe(40_000);
    expect(resumen.proximoAVencer?.paqueteId).toBe("paq-ledger");
    expect(resumen.serviciosCubiertosActivosIds).toEqual([
      "srv-facial",
      "srv-masaje",
    ]);
  });
});
