import { describe, it, expect } from "vitest";
import {
  validarServicioPayload,
  pesosACentavos,
  centavosAPesos,
  formatearPrecioPesos,
  obtenerCategoriasDisponibles,
  filtrarServicios,
  calcularResumenCatalogo,
} from "./catalogoServicios";
import { ServicioItem } from "./entities";

describe("catalogoServicios domain functions", () => {
  const serviciosMock: ServicioItem[] = [
    {
      id: "srv-1",
      negocioId: "neg-1",
      nombre: "Corte Clásico",
      descripcion: "Corte a máquina y tijera",
      duracionMin: 30,
      precioCentavos: 20000,
      categoria: "Cortes",
      activo: true,
    },
    {
      id: "srv-2",
      negocioId: "neg-1",
      nombre: "Perfilado de Barba",
      descripcion: "Toalla caliente y navaja",
      duracionMin: 20,
      precioCentavos: 15000,
      categoria: "Barba",
      activo: true,
    },
    {
      id: "srv-3",
      negocioId: "neg-1",
      nombre: "Tratamiento Facial",
      descripcion: "Exfoliación profunda",
      duracionMin: 40,
      precioCentavos: 35000,
      categoria: "Tratamientos",
      activo: false,
    },
    {
      id: "srv-4",
      negocioId: "neg-1",
      nombre: "Corte Infantil",
      descripcion: null,
      duracionMin: 25,
      precioCentavos: 18000,
      categoria: "Cortes",
      activo: false,
    },
  ];

  describe("validarServicioPayload", () => {
    it("valida payload correcto satisfactoriamente", () => {
      const res = validarServicioPayload({
        nombre: "Corte Fade",
        duracionMin: 35,
        precioCentavos: 25000,
        categoria: "Cortes",
      });

      expect(res.valido).toBe(true);
      expect(res.errores).toEqual({});
    });

    it("detecta nombre vacío o demasiado corto", () => {
      const resVacio = validarServicioPayload({
        nombre: "",
        duracionMin: 30,
        precioCentavos: 20000,
      });
      expect(resVacio.valido).toBe(false);
      expect(resVacio.errores.nombre).toBe("El nombre del servicio es obligatorio.");

      const resCorto = validarServicioPayload({
        nombre: "A",
        duracionMin: 30,
        precioCentavos: 20000,
      });
      expect(resCorto.valido).toBe(false);
      expect(resCorto.errores.nombre).toBe("El nombre debe contener al menos 2 caracteres.");
    });

    it("detecta duración inválida (cero, negativa o superior a 8 horas)", () => {
      const resCero = validarServicioPayload({
        nombre: "Servicio Test",
        duracionMin: 0,
        precioCentavos: 10000,
      });
      expect(resCero.valido).toBe(false);
      expect(resCero.errores.duracionMin).toContain("mayor a 0 minutos");

      const resExcesivo = validarServicioPayload({
        nombre: "Servicio Test",
        duracionMin: 500,
        precioCentavos: 10000,
      });
      expect(resExcesivo.valido).toBe(false);
      expect(resExcesivo.errores.duracionMin).toContain("máxima permitida es de 480 minutos");
    });

    it("detecta precio negativo o no provisto", () => {
      const resNegativo = validarServicioPayload({
        nombre: "Servicio Test",
        duracionMin: 30,
        precioCentavos: -100,
      });
      expect(resNegativo.valido).toBe(false);
      expect(resNegativo.errores.precioCentavos).toBe("El precio no puede ser negativo.");
    });
  });

  describe("conversión de precios y monedas", () => {
    it("convierte pesos a centavos correctamente", () => {
      expect(pesosACentavos(250)).toBe(25000);
      expect(pesosACentavos(99.99)).toBe(9999);
      expect(pesosACentavos(0)).toBe(0);
    });

    it("convierte centavos a pesos decimales", () => {
      expect(centavosAPesos(25000)).toBe(250);
      expect(centavosAPesos(9999)).toBe(99.99);
      expect(centavosAPesos(0)).toBe(0);
    });

    it("formatea moneda a representación visual estándar", () => {
      expect(formatearPrecioPesos(25000)).toBe("$250.00");
      expect(formatearPrecioPesos(15050)).toBe("$150.50");
    });
  });

  describe("obtenerCategoriasDisponibles", () => {
    it("extrae lista ordenada y sin duplicados de categorías", () => {
      const categorias = obtenerCategoriasDisponibles(serviciosMock);
      expect(categorias).toEqual(["Barba", "Cortes", "Tratamientos"]);
    });

    it("maneja listas vacías o servicios sin categoría", () => {
      expect(obtenerCategoriasDisponibles([])).toEqual([]);
      expect(
        obtenerCategoriasDisponibles([
          {
            id: "1",
            negocioId: "neg",
            nombre: "General",
            descripcion: null,
            duracionMin: 30,
            precioCentavos: 10000,
            activo: true,
          },
        ])
      ).toEqual([]);
    });
  });

  describe("filtrarServicios", () => {
    it("filtra correctamente por categoría específica", () => {
      const filtrados = filtrarServicios(serviciosMock, { categoria: "Cortes" });
      expect(filtrados).toHaveLength(2);
      expect(filtrados.every((s) => s.categoria === "Cortes")).toBe(true);
    });

    it("retorna todos si la categoría es 'todas'", () => {
      const filtrados = filtrarServicios(serviciosMock, { categoria: "todas" });
      expect(filtrados).toHaveLength(4);
    });

    it("filtra por término de búsqueda en nombre", () => {
      const filtrados = filtrarServicios(serviciosMock, { busqueda: "Barba" });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].id).toBe("srv-2");
    });

    it("filtra por término de búsqueda en descripción", () => {
      const filtrados = filtrarServicios(serviciosMock, { busqueda: "profunda" });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].id).toBe("srv-3");
    });
  });

  describe("calcularResumenCatalogo", () => {
    it("calcula totales, desglose activo/pausado y promedios con precisión", () => {
      const resumen = calcularResumenCatalogo(serviciosMock);

      expect(resumen.totalServicios).toBe(4);
      expect(resumen.activos).toBe(2);
      expect(resumen.pausados).toBe(2);
      // Precios: 20000 + 15000 + 35000 + 18000 = 88000 / 4 = 22000 centavos ($220)
      expect(resumen.precioPromedioCentavos).toBe(22000);
      // Duración: 30 + 20 + 40 + 25 = 115 / 4 = 28.75 -> 29 minutos
      expect(resumen.duracionPromedioMin).toBe(29);
    });

    it("maneja caso borde de catálogo vacío sin NaN", () => {
      const resumen = calcularResumenCatalogo([]);
      expect(resumen.totalServicios).toBe(0);
      expect(resumen.activos).toBe(0);
      expect(resumen.pausados).toBe(0);
      expect(resumen.precioPromedioCentavos).toBe(0);
      expect(resumen.duracionPromedioMin).toBe(0);
    });
  });
});
