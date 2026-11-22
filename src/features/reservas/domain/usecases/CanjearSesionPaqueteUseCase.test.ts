import { describe, expect, it } from "vitest";
import type {
  MovimientoCreditoPaquete,
  PaqueteSesionesCliente,
} from "../paquetesSesiones";
import { CanjearSesionPaqueteUseCase } from "./CanjearSesionPaqueteUseCase";

describe("CanjearSesionPaqueteUseCase", () => {
  const useCase = new CanjearSesionPaqueteUseCase();
  const ahora = new Date("2026-11-22T14:00:00Z");

  const paqueteProximo: PaqueteSesionesCliente = {
    id: "paq-proximo",
    negocioId: "neg-spa",
    clienteId: "cli-1",
    nombre: "Bono Noviembre 3 Masajes",
    sesionesTotales: 3,
    sesionesConsumidas: 2,
    serviciosCubiertosIds: ["srv-masaje"],
    fechaCompra: new Date("2026-10-01T10:00:00Z"),
    fechaExpiracion: new Date("2026-11-30T23:59:59Z"),
    estado: "ACTIVO",
    valorUnitarioCentavos: 40_000,
  };

  const paqueteLargo: PaqueteSesionesCliente = {
    id: "paq-largo",
    negocioId: "neg-spa",
    clienteId: "cli-1",
    nombre: "Membresía Anual 10 Masajes",
    sesionesTotales: 10,
    sesionesConsumidas: 0,
    serviciosCubiertosIds: ["srv-masaje", "srv-facial"],
    fechaCompra: new Date("2026-11-01T10:00:00Z"),
    fechaExpiracion: new Date("2027-06-01T23:59:59Z"),
    estado: "ACTIVO",
    valorUnitarioCentavos: 35_000,
  };

  it("auto-selecciona el paquete por vencimiento más próximo (FEFO), actualiza estado a AGOTADO y recalcula billetera", () => {
    const res = useCase.execute({
      negocioId: "neg-spa",
      clienteId: "cli-1",
      servicioId: "srv-masaje",
      citaId: "cita-500",
      paquetesCliente: [paqueteLargo, paqueteProximo],
      ahora,
    });

    expect(res.canjeado).toBe(true);
    expect(res.seleccionAutomatica).toBe(true);
    expect(res.paqueteId).toBe("paq-proximo");
    expect(res.paqueteActualizado?.estado).toBe("AGOTADO");
    expect(res.sesionesRestantesEnPaquete).toBe(0);
    expect(res.valorCanjeadoCentavos).toBe(40_000);
    expect(res.movimientoGenerado?.tipo).toBe("CANJE");
    expect(res.resumenBilleteraActualizado.paquetesActivos).toBe(1);
    expect(res.resumenBilleteraActualizado.paquetesAgotados).toBe(1);
    expect(res.resumenBilleteraActualizado.sesionesDisponiblesActivas).toBe(10);
    expect(res.resumenBilleteraActualizado.creditoDisponibleActivoCentavos).toBe(
      350_000
    );
  });

  it("detecta canjes duplicados e inconsistencias del libro de créditos antes de ejecutar el canje", () => {
    const libroSincronizado: MovimientoCreditoPaquete[] = [
      {
        id: "m-compra",
        paqueteId: "paq-proximo",
        clienteId: "cli-1",
        tipo: "COMPRA",
        sesionesDelta: 3,
        montoCentavosDelta: 120_000,
        fecha: new Date("2026-10-01T10:00:00Z"),
        descripcion: "Compra bono",
      },
      {
        id: "m-c1",
        paqueteId: "paq-proximo",
        clienteId: "cli-1",
        tipo: "CANJE",
        sesionesDelta: -2,
        montoCentavosDelta: -80_000,
        citaId: "cita-previa",
        fecha: new Date("2026-10-15T10:00:00Z"),
        descripcion: "Canje previo",
      },
    ];

    const duplicado = useCase.execute({
      negocioId: "neg-spa",
      clienteId: "cli-1",
      servicioId: "srv-masaje",
      citaId: "cita-previa",
      paquetesCliente: [paqueteProximo],
      paqueteId: "paq-proximo",
      movimientosLibro: libroSincronizado,
      ahora,
    });
    expect(duplicado.canjeado).toBe(false);
    expect(duplicado.motivoRechazo).toBe("CANJE_DUPLICADO");

    // Libro desincronizado respecto al snapshot del paquete
    const desincronizado = useCase.execute({
      negocioId: "neg-spa",
      clienteId: "cli-1",
      servicioId: "srv-masaje",
      citaId: "cita-nueva",
      paquetesCliente: [paqueteProximo],
      paqueteId: "paq-proximo",
      movimientosLibro: [libroSincronizado[0]!], // Dice 3 disponibles, paquete dice 1
      ahora,
    });
    expect(desincronizado.canjeado).toBe(false);
    expect(desincronizado.motivoRechazo).toBe("LIBRO_DESINCRONIZADO");
  });

  it("orquesta reversión de canje y cálculo de reembolso prorrateado", () => {
    const canje = useCase.execute({
      negocioId: "neg-spa",
      clienteId: "cli-1",
      servicioId: "srv-masaje",
      citaId: "cita-501",
      paquetesCliente: [paqueteProximo],
      paqueteId: "paq-proximo",
      ahora,
    });
    expect(canje.canjeado).toBe(true);

    const reversion = useCase.revertirCanje({
      negocioId: "neg-spa",
      paquete: canje.paqueteActualizado!,
      citaId: "cita-501",
      ahora,
    });
    expect(reversion.exito).toBe(true);
    expect(reversion.paqueteActualizado?.estado).toBe("ACTIVO");
    expect(reversion.paqueteActualizado?.sesionesConsumidas).toBe(2);

    const reembolso = useCase.calcularReembolsoProrrateado({
      negocioId: "neg-spa",
      paquete: paqueteLargo,
      ahora,
      porcentajePenalizacion: 10,
    });
    expect(reembolso.reembolsable).toBe(true);
    expect(reembolso.valorBrutoNoUtilizadoCentavos).toBe(350_000);
    expect(reembolso.montoReembolsoNetoCentavos).toBe(315_000);
  });

  it("rechaza contratos de entrada inválidos en execute, revertirCanje y calcularReembolsoProrrateado", () => {
    expect(() =>
      useCase.execute({
        negocioId: " ",
        clienteId: "cli-1",
        servicioId: "srv-masaje",
        citaId: "cita-1",
        paquetesCliente: [paqueteProximo],
        ahora,
      })
    ).toThrow(/negocioId/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-spa",
        clienteId: "cli-1",
        servicioId: "srv-masaje",
        citaId: "cita-1",
        paquetesCliente: [paqueteProximo],
        sesionesARedimir: -2,
        ahora,
      })
    ).toThrow(/sesionesARedimir/);

    expect(() =>
      useCase.revertirCanje({
        negocioId: "otro-negocio",
        paquete: paqueteProximo,
        citaId: "cita-1",
        ahora,
      })
    ).toThrow(/no pertenece al negocio/);

    expect(() =>
      useCase.calcularReembolsoProrrateado({
        negocioId: "neg-spa",
        paquete: paqueteProximo,
        ahora: new Date("invalid"),
      })
    ).toThrow(/ahora/);
  });
});
