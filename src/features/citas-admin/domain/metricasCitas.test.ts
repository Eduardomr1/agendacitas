import { describe, it, expect } from "vitest";
import { CitaAdminItem } from "./entities";
import {
  calcularMetricasCitas,
  obtenerInicioDeSemana,
  obtenerDiasDeSemana,
  esMismoDia,
  formatearRangoSemana,
} from "./metricasCitas";

describe("metricasCitas domain logic", () => {
  const citasMock: CitaAdminItem[] = [
    {
      id: "1",
      negocioId: "neg-1",
      servicioId: "srv-1",
      servicioNombre: "Corte",
      duracionMin: 30,
      precioCentavos: 20000,
      inicio: new Date("2026-10-14T10:00:00Z"),
      fin: new Date("2026-10-14T10:30:00Z"),
      clienteNombre: "Juan Perez",
      clienteEmail: "juan@example.com",
      clienteTelefono: "1234567890",
      estado: "confirmada",
    },
    {
      id: "2",
      negocioId: "neg-1",
      servicioId: "srv-2",
      servicioNombre: "Barba",
      duracionMin: 20,
      precioCentavos: 15000,
      inicio: new Date("2026-10-14T11:00:00Z"),
      fin: new Date("2026-10-14T11:20:00Z"),
      clienteNombre: "Juan Perez",
      clienteEmail: "juan@example.com",
      clienteTelefono: "1234567890",
      estado: "completada",
    },
    {
      id: "3",
      negocioId: "neg-1",
      servicioId: "srv-1",
      servicioNombre: "Corte",
      duracionMin: 30,
      precioCentavos: 20000,
      inicio: new Date("2026-10-15T15:00:00Z"),
      fin: new Date("2026-10-15T15:30:00Z"),
      clienteNombre: "Maria Lopez",
      clienteEmail: "maria@example.com",
      clienteTelefono: null,
      estado: "cancelada",
    },
  ];

  it("calcula metricas financieras y de efectividad correctamente", () => {
    const metricas = calcularMetricasCitas(citasMock);

    expect(metricas.totalCitas).toBe(3);
    expect(metricas.confirmadas).toBe(1);
    expect(metricas.completadas).toBe(1);
    expect(metricas.canceladas).toBe(1);
    expect(metricas.ingresosCentavos).toBe(35000); // 20000 + 15000
    expect(metricas.tasaEfectividad).toBe(67); // 2 / 3 = 66.6% -> 67%
    expect(metricas.ticketPromedioCentavos).toBe(17500); // 35000 / 2
  });

  it("detecta clientes unicos y recurrentes adecuadamente", () => {
    const metricas = calcularMetricasCitas(citasMock);

    expect(metricas.clientesUnicos).toBe(2); // juan@example.com y maria@example.com
    expect(metricas.clientesRecurrentes).toBe(1); // juan tiene 2 citas
    expect(metricas.tasaRecurrencia).toBe(50); // 1 de 2 clientes = 50%
  });

  it("maneja caso borde de citas vacias sin division por cero", () => {
    const metricas = calcularMetricasCitas([]);

    expect(metricas.totalCitas).toBe(0);
    expect(metricas.confirmadas).toBe(0);
    expect(metricas.completadas).toBe(0);
    expect(metricas.canceladas).toBe(0);
    expect(metricas.ingresosCentavos).toBe(0);
    expect(metricas.tasaEfectividad).toBe(100);
    expect(metricas.ticketPromedioCentavos).toBe(0);
    expect(metricas.clientesUnicos).toBe(0);
    expect(metricas.clientesRecurrentes).toBe(0);
    expect(metricas.tasaRecurrencia).toBe(0);
  });

  it("obtiene correctamente el lunes como inicio de semana", () => {
    // 2026-10-14 es Miércoles
    const fecha = new Date(2026, 9, 14); // Octubre es mes 9 (0-indexed)
    const inicio = obtenerInicioDeSemana(fecha);

    expect(inicio.getDay()).toBe(1); // Lunes
    expect(inicio.getDate()).toBe(12); // Lunes 12 de Octubre 2026
  });

  it("obtiene inicio de semana correcto cuando la fecha es Domingo", () => {
    // 2026-10-18 es Domingo
    const fecha = new Date(2026, 9, 18);
    const inicio = obtenerInicioDeSemana(fecha);

    expect(inicio.getDay()).toBe(1); // Lunes
    expect(inicio.getDate()).toBe(12); // Lunes 12 de Octubre 2026
  });

  it("genera array de 7 dias correlativos para la semana", () => {
    const fecha = new Date(2026, 9, 14);
    const dias = obtenerDiasDeSemana(fecha);

    expect(dias).toHaveLength(7);
    expect(dias[0].getDay()).toBe(1); // Lunes
    expect(dias[6].getDay()).toBe(0); // Domingo
    expect(dias[0].getDate()).toBe(12);
    expect(dias[6].getDate()).toBe(18);
  });

  it("comprueba si dos fechas corresponden al mismo dia", () => {
    const d1 = new Date(2026, 9, 14, 10, 30);
    const d2 = new Date(2026, 9, 14, 18, 0);
    const d3 = new Date(2026, 9, 15, 10, 30);

    expect(esMismoDia(d1, d2)).toBe(true);
    expect(esMismoDia(d1, d3)).toBe(false);
  });

  it("formatea el rango de semana correctamente", () => {
    const fecha = new Date(2026, 9, 14);
    const dias = obtenerDiasDeSemana(fecha);
    const texto = formatearRangoSemana(dias);

    expect(texto).toBe("12 – 18 de oct 2026");
  });
});
