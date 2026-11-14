import { describe, expect, it } from "vitest";
import {
  MotorTarificadorReservas,
  type CuponPromocional,
  type ItemServicioCotizable,
  type ReglaTarifaDinamica,
} from "./tarificadorReservas";

const corteCabello: ItemServicioCotizable = {
  servicioId: "srv-corte",
  nombre: "Corte Clásico",
  duracionMin: 30,
  precioCentavos: 25_000, // $250.00
};

const barbaPremium: ItemServicioCotizable = {
  servicioId: "srv-barba",
  nombre: "Arreglo de Barba",
  duracionMin: 20,
  precioCentavos: 15_000, // $150.00
};

describe("MotorTarificadorReservas", () => {
  it("cotiza múltiples servicios acumulando duración y subtotal exacto sin reglas", () => {
    const fechaCot = new Date(2026, 10, 10, 9, 0, 0);
    const fechaCita = new Date(2026, 10, 11, 11, 0, 0);

    const resultado = MotorTarificadorReservas.cotizar({
      servicios: [corteCabello, barbaPremium],
      fechaCita,
      fechaCotizacion: fechaCot,
      horaInicio: "11:00",
    });

    expect(resultado.duracionTotalMin).toBe(50);
    expect(resultado.subtotalBaseCentavos).toBe(40_000);
    expect(resultado.totalNetoCentavos).toBe(40_000);
    expect(resultado.anticipoRequeridoCentavos).toBe(0);
    expect(resultado.saldoEnSucursalCentavos).toBe(40_000);
  });

  it("aplica DESCUENTO_VALLE en día y franja horaria de baja demanda", () => {
    // Miércoles (3) a las 10:00 AM
    const miercolesManana = new Date(2026, 10, 11, 10, 0, 0);
    const reglaValle: ReglaTarifaDinamica = {
      id: "regla-valle",
      nombre: "Happy Hour Matutino",
      tipo: "DESCUENTO_VALLE",
      activa: true,
      porcentajeAjuste: 20,
      diasSemana: [1, 2, 3], // Lunes a Miércoles
      horaInicio: "09:00",
      horaFin: "13:00",
    };

    const resultado = MotorTarificadorReservas.cotizar({
      servicios: [corteCabello],
      fechaCita: miercolesManana,
      fechaCotizacion: new Date(2026, 10, 10, 10, 0, 0),
      horaInicio: "10:00",
      reglasDinamicas: [reglaValle],
    });

    expect(resultado.reglasAplicadas).toHaveLength(1);
    expect(resultado.ajusteDinamicoNetoCentavos).toBe(-5_000); // -20% de 25,000
    expect(resultado.subtotalAjustadoCentavos).toBe(20_000);
    expect(resultado.totalNetoCentavos).toBe(20_000);
  });

  it("aplica RECARGO_PICO cuando la ocupación supera el umbral configurado", () => {
    const sabado = new Date(2026, 10, 14, 17, 0, 0);
    const reglaPico: ReglaTarifaDinamica = {
      id: "regla-pico",
      nombre: "Alta Demanda Fin de Semana",
      tipo: "RECARGO_PICO",
      activa: true,
      porcentajeAjuste: 15,
      ocupacionMinimaPorc: 80,
    };

    const conAltaOcupacion = MotorTarificadorReservas.cotizar({
      servicios: [corteCabello],
      fechaCita: sabado,
      fechaCotizacion: new Date(2026, 10, 13, 12, 0, 0),
      horaInicio: "17:00",
      ocupacionDiaPorc: 85,
      reglasDinamicas: [reglaPico],
    });
    expect(conAltaOcupacion.ajusteDinamicoNetoCentavos).toBe(3_750);
    expect(conAltaOcupacion.totalNetoCentavos).toBe(28_750);

    const conBajaOcupacion = MotorTarificadorReservas.cotizar({
      servicios: [corteCabello],
      fechaCita: sabado,
      fechaCotizacion: new Date(2026, 10, 13, 12, 0, 0),
      horaInicio: "17:00",
      ocupacionDiaPorc: 50,
      reglasDinamicas: [reglaPico],
    });
    expect(conBajaOcupacion.ajusteDinamicoNetoCentavos).toBe(0);
  });

  it("aplica DESCUENTO_PAQUETE apilable junto a RECARGO_URGENCIA por reserva inmediata", () => {
    const fechaCot = new Date(2026, 10, 14, 14, 0, 0);
    const fechaCita = new Date(2026, 10, 14, 15, 0, 0); // 1 hora después

    const paquete: ReglaTarifaDinamica = {
      id: "regla-paq",
      nombre: "Combo Completo",
      tipo: "DESCUENTO_PAQUETE",
      activa: true,
      porcentajeAjuste: 10,
      minServiciosPaquete: 2,
      apilable: true,
    };

    const urgencia: ReglaTarifaDinamica = {
      id: "regla-urg",
      nombre: "Reserva Último Minuto",
      tipo: "RECARGO_URGENCIA",
      activa: true,
      porcentajeAjuste: 25,
      anticipacionMaxHoras: 2,
      apilable: true,
    };

    const res = MotorTarificadorReservas.cotizar({
      servicios: [corteCabello, barbaPremium], // 40,000 base
      fechaCita,
      fechaCotizacion: fechaCot,
      horaInicio: "15:00",
      reglasDinamicas: [paquete, urgencia],
    });

    // -10% (-4,000) + 25% (+10,000) = +6,000 neto -> 46,000
    expect(res.reglasAplicadas).toHaveLength(2);
    expect(res.ajusteDinamicoNetoCentavos).toBe(6_000);
    expect(res.totalNetoCentavos).toBe(46_000);
  });

  it("evita apilar reglas exclusivas y selecciona la más favorable al cliente", () => {
    const fecha = new Date(2026, 10, 11, 10, 0, 0);
    const desc10: ReglaTarifaDinamica = {
      id: "d10",
      nombre: "Desc 10%",
      tipo: "DESCUENTO_VALLE",
      activa: true,
      porcentajeAjuste: 10,
      apilable: false,
    };
    const desc25: ReglaTarifaDinamica = {
      id: "d25",
      nombre: "Combo 25%",
      tipo: "DESCUENTO_PAQUETE",
      activa: true,
      porcentajeAjuste: 25,
      minServiciosPaquete: 2,
      apilable: false,
    };

    const res = MotorTarificadorReservas.cotizar({
      servicios: [corteCabello, barbaPremium], // 40,000
      fechaCita: fecha,
      fechaCotizacion: new Date(2026, 10, 10, 10, 0, 0),
      horaInicio: "10:00",
      reglasDinamicas: [desc10, desc25],
    });

    expect(res.reglasAplicadas).toHaveLength(1);
    expect(res.reglasAplicadas[0]?.reglaId).toBe("d25");
    expect(res.totalNetoCentavos).toBe(30_000);
  });

  describe("evaluación de cupones promocionales", () => {
    const ahora = new Date(2026, 10, 14, 12, 0, 0);
    const baseCupon: CuponPromocional = {
      codigo: " bienvenido15 ",
      activo: true,
      tipo: "PORCENTAJE",
      valor: 15,
      validoDesde: new Date(2026, 10, 1),
      validoHasta: new Date(2026, 10, 30),
      usosActuales: 2,
      usosMaximos: 10,
      descuentoMaximoCentavos: 5_000,
    };

    it("aplica cupón válido normalizando código y respetando tope descuentoMaximoCentavos", () => {
      const res = MotorTarificadorReservas.cotizar({
        servicios: [corteCabello, barbaPremium], // 40,000 -> 15% = 6,000 -> topado a 5,000
        fechaCita: new Date(2026, 10, 15, 11, 0, 0),
        fechaCotizacion: ahora,
        horaInicio: "11:00",
        cupon: baseCupon,
      });

      expect(res.evaluacionCupon?.codigo).toBe("BIENVENIDO15");
      expect(res.evaluacionCupon?.aplicado).toBe(true);
      expect(res.descuentoCuponCentavos).toBe(5_000);
      expect(res.totalNetoCentavos).toBe(35_000);
    });

    it("aplica cupón de monto fijo sin permitir saldo negativo", () => {
      const res = MotorTarificadorReservas.cotizar({
        servicios: [barbaPremium], // 15,000
        fechaCita: new Date(2026, 10, 15, 11, 0, 0),
        fechaCotizacion: ahora,
        horaInicio: "11:00",
        cupon: { ...baseCupon, tipo: "MONTO_FIJO_CENTAVOS", valor: 20_000, descuentoMaximoCentavos: undefined },
      });

      expect(res.evaluacionCupon?.aplicado).toBe(true);
      expect(res.descuentoCuponCentavos).toBe(15_000);
      expect(res.totalNetoCentavos).toBe(0);
    });

    it("rechaza cupones inactivos, expirados, agotados, sin monto mínimo o servicio no elegible", () => {
      const evaluar = (override: Partial<CuponPromocional>) =>
        MotorTarificadorReservas.evaluarCupon(
          { ...baseCupon, ...override },
          25_000,
          [corteCabello],
          ahora
        );

      expect(evaluar({ activo: false }).motivoRechazo).toBe("CUPON_INACTIVO");
      expect(evaluar({ validoDesde: new Date(2026, 10, 20) }).motivoRechazo).toBe("CUPON_NO_VIGENTE");
      expect(evaluar({ validoHasta: new Date(2026, 10, 10) }).motivoRechazo).toBe("CUPON_EXPIRADO");
      expect(evaluar({ usosActuales: 10, usosMaximos: 10 }).motivoRechazo).toBe("CUPON_AGOTADO");
      expect(evaluar({ montoMinimoCentavos: 30_000 }).motivoRechazo).toBe("MONTO_MINIMO_NO_ALCANZADO");
      expect(evaluar({ serviciosElegiblesIds: ["srv-spa"] }).motivoRechazo).toBe("SERVICIO_NO_ELEGIBLE");
    });
  });

  describe("cálculo de anticipo y protección contra inasistencias (No-Show)", () => {
    const politica = {
      porcentajeBase: 20,
      porcentajeAltoRiesgo: 50,
      montoMinimoParaAnticipoCentavos: 20_000,
    };

    it("aplica porcentaje base al cliente regular y garantiza suma exacta con saldo en sucursal", () => {
      const res = MotorTarificadorReservas.cotizar({
        servicios: [corteCabello, barbaPremium], // 40,000
        fechaCita: new Date(2026, 10, 15, 11, 0, 0),
        fechaCotizacion: new Date(2026, 10, 14, 11, 0, 0),
        horaInicio: "11:00",
        historialNoShowsCliente: 0,
        politicaAnticipo: politica,
      });

      expect(res.porcentajeAnticipoAplicado).toBe(20);
      expect(res.anticipoRequeridoCentavos).toBe(8_000);
      expect(res.saldoEnSucursalCentavos).toBe(32_000);
      expect(res.anticipoRequeridoCentavos + res.saldoEnSucursalCentavos).toBe(
        res.totalNetoCentavos
      );
    });

    it("eleva anticipo al porcentajeAltoRiesgo cuando el cliente registra no-shows previos", () => {
      // Incluso si el monto es menor al umbral mínimo, un no-show exige anticipo
      const res = MotorTarificadorReservas.cotizar({
        servicios: [barbaPremium], // 15,000 (< 20,000 mínimo)
        fechaCita: new Date(2026, 10, 15, 11, 0, 0),
        fechaCotizacion: new Date(2026, 10, 14, 11, 0, 0),
        horaInicio: "11:00",
        historialNoShowsCliente: 2,
        politicaAnticipo: politica,
      });

      expect(res.porcentajeAnticipoAplicado).toBe(50);
      expect(res.anticipoRequeridoCentavos).toBe(7_500);
      expect(res.saldoEnSucursalCentavos).toBe(7_500);
    });
  });
});
