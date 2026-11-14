import { describe, expect, it } from "vitest";
import { CotizarReservaUseCase } from "./CotizarReservaUseCase";

describe("CotizarReservaUseCase", () => {
  const useCase = new CotizarReservaUseCase();

  it("orquesta la cotización válida con descuento y anticipo", () => {
    const res = useCase.execute({
      negocioId: "neg-123",
      servicios: [
        {
          servicioId: "srv-1",
          nombre: "Masaje Relajante",
          duracionMin: 60,
          precioCentavos: 60_000,
        },
      ],
      fechaCita: new Date(2026, 10, 15, 16, 0, 0),
      fechaCotizacion: new Date(2026, 10, 14, 10, 0, 0),
      horaInicio: "16:00",
      politicaAnticipo: {
        porcentajeBase: 25,
      },
    });

    expect(res.totalNetoCentavos).toBe(60_000);
    expect(res.anticipoRequeridoCentavos).toBe(15_000);
    expect(res.saldoEnSucursalCentavos).toBe(45_000);
  });

  it("rechaza negocioId vacío, hora inválida o lista de servicios vacía", () => {
    expect(() =>
      useCase.execute({
        negocioId: "  ",
        servicios: [
          { servicioId: "s1", nombre: "Corte", duracionMin: 30, precioCentavos: 20_000 },
        ],
        fechaCita: new Date(2026, 10, 15, 16, 0, 0),
        horaInicio: "16:00",
      })
    ).toThrow(/negocioId/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-1",
        servicios: [],
        fechaCita: new Date(2026, 10, 15, 16, 0, 0),
        horaInicio: "16:00",
      })
    ).toThrow(/al menos un servicio/);

    expect(() =>
      useCase.execute({
        negocioId: "neg-1",
        servicios: [
          { servicioId: "s1", nombre: "Corte", duracionMin: 30, precioCentavos: 20_000 },
        ],
        fechaCita: new Date(2026, 10, 15, 16, 0, 0),
        horaInicio: "4pm",
      })
    ).toThrow(/HH:MM/);
  });
});
