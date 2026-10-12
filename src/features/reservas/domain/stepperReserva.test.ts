import { describe, it, expect } from "vitest";
import {
  PASOS_RESERVA,
  validarPaso1,
  validarPaso2,
  validarPaso3,
  puedeNavegarAPaso,
  determinarEstadoPaso,
  calcularProgresoPorcentaje,
  formatearPrecio,
  formatearFechaLegible,
  EstadoCompletoStepper,
} from "./stepperReserva";

describe("stepperReserva (Dominio y Validaciones)", () => {
  describe("Constantes de Pasos", () => {
    it("define exactamente 3 pasos de reserva con títulos y subtítulos", () => {
      expect(PASOS_RESERVA).toHaveLength(3);
      expect(PASOS_RESERVA[0].numero).toBe(1);
      expect(PASOS_RESERVA[0].titulo).toBe("Servicio");
      expect(PASOS_RESERVA[1].numero).toBe(2);
      expect(PASOS_RESERVA[1].titulo).toBe("Fecha y Horario");
      expect(PASOS_RESERVA[2].numero).toBe(3);
      expect(PASOS_RESERVA[2].titulo).toBe("Tus Datos");
    });
  });

  describe("validarPaso1 (Selección de Servicio)", () => {
    it("falla si no hay servicio seleccionado o está vacío", () => {
      expect(validarPaso1({}).esValido).toBe(false);
      expect(validarPaso1({ servicioId: "" }).esValido).toBe(false);
      expect(validarPaso1({ servicioId: "   " }).esValido).toBe(false);
      expect(validarPaso1({}).error).toBe("Debes seleccionar un servicio para continuar.");
    });

    it("es válido cuando se proporciona un id de servicio", () => {
      const res = validarPaso1({ servicioId: "srv-corte-1" });
      expect(res.esValido).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe("validarPaso2 (Fecha y Horario)", () => {
    it("falla si la fecha o el slot están ausentes o tienen formato incorrecto", () => {
      const sinFechaNiSlot = validarPaso2({});
      expect(sinFechaNiSlot.esValido).toBe(false);
      expect(sinFechaNiSlot.errores.fecha).toBeDefined();
      expect(sinFechaNiSlot.errores.slot).toBeDefined();

      const fechaInvalida = validarPaso2({ fecha: "15/10/2026", slot: "10:00" });
      expect(fechaInvalida.esValido).toBe(false);
      expect(fechaInvalida.errores.fecha).toBe("Selecciona una fecha válida.");

      const slotInvalido = validarPaso2({ fecha: "2026-10-15", slot: "manana" });
      expect(slotInvalido.esValido).toBe(false);
      expect(slotInvalido.errores.slot).toBe("Selecciona un horario disponible.");
    });

    it("es válido con fecha ISO YYYY-MM-DD y slot HH:mm válidos", () => {
      const res = validarPaso2({ fecha: "2026-10-15", slot: "10:30" });
      expect(res.esValido).toBe(true);
      expect(res.errores).toEqual({});
    });
  });

  describe("validarPaso3 (Datos de Contacto)", () => {
    it("falla si el nombre está vacío o tiene menos de 2 caracteres", () => {
      const vacio = validarPaso3({ nombre: "", email: "test@correo.com" });
      expect(vacio.esValido).toBe(false);
      expect(vacio.errores.nombre).toBe("El nombre completo es obligatorio.");

      const unCaracter = validarPaso3({ nombre: "A", email: "test@correo.com" });
      expect(unCaracter.esValido).toBe(false);
      expect(unCaracter.errores.nombre).toBe("El nombre debe tener al menos 2 caracteres.");
    });

    it("falla si el correo electrónico es inválido", () => {
      const sinEmail = validarPaso3({ nombre: "Eduardo Maytorena", email: "" });
      expect(sinEmail.esValido).toBe(false);
      expect(sinEmail.errores.email).toBe("El correo electrónico es obligatorio.");

      const emailSinArroba = validarPaso3({ nombre: "Eduardo Maytorena", email: "eduardosinmail" });
      expect(emailSinArroba.esValido).toBe(false);
      expect(emailSinArroba.errores.email).toBe("Ingresa un correo electrónico válido.");

      const emailSinDominio = validarPaso3({ nombre: "Eduardo Maytorena", email: "eduardo@" });
      expect(emailSinDominio.esValido).toBe(false);
      expect(emailSinDominio.errores.email).toBe("Ingresa un correo electrónico válido.");
    });

    it("valida el formato de teléfono si fue proporcionado", () => {
      const telInvalido = validarPaso3({
        nombre: "Eduardo Maytorena",
        email: "eduardo@test.com",
        telefono: "abc",
      });
      expect(telInvalido.esValido).toBe(false);
      expect(telInvalido.errores.telefono).toBeDefined();

      const telValido = validarPaso3({
        nombre: "Eduardo Maytorena",
        email: "eduardo@test.com",
        telefono: "+52 662 123 4567",
      });
      expect(telValido.esValido).toBe(true);
    });

    it("valida límite máximo de notas opcionales (máx 500 caracteres)", () => {
      const notasMuyLargas = "a".repeat(501);
      const res = validarPaso3({
        nombre: "Eduardo Maytorena",
        email: "eduardo@test.com",
        notas: notasMuyLargas,
      });
      expect(res.esValido).toBe(false);
      expect(res.errores.notas).toBe("Las notas no pueden superar los 500 caracteres.");
    });

    it("es válido con nombre y correo correctos y campos opcionales válidos", () => {
      const res = validarPaso3({
        nombre: "Carlos Gómez",
        email: "carlos@ejemplo.com",
        telefono: "6622113344",
        notas: "Por favor corte bajo con desvanecido.",
      });
      expect(res.esValido).toBe(true);
      expect(res.errores).toEqual({});
    });
  });

  describe("puedeNavegarAPaso (Navegación controlada)", () => {
    const estadoIncompleto: EstadoCompletoStepper = {
      pasoActual: 1,
      paso1: {},
      paso2: {},
      paso3: { nombre: "", email: "" },
    };

    const estadoPaso1Completo: EstadoCompletoStepper = {
      pasoActual: 1,
      paso1: { servicioId: "srv-1" },
      paso2: {},
      paso3: { nombre: "", email: "" },
    };

    const estadoPaso2Completo: EstadoCompletoStepper = {
      pasoActual: 2,
      paso1: { servicioId: "srv-1" },
      paso2: { fecha: "2026-10-15", slot: "11:00" },
      paso3: { nombre: "", email: "" },
    };

    it("siempre permite navegar hacia atrás o al mismo paso", () => {
      expect(puedeNavegarAPaso(1, estadoPaso2Completo)).toBe(true);
      expect(puedeNavegarAPaso(2, estadoPaso2Completo)).toBe(true);
    });

    it("bloquea el paso 2 si el paso 1 no tiene servicio seleccionado", () => {
      expect(puedeNavegarAPaso(2, estadoIncompleto)).toBe(false);
    });

    it("permite el paso 2 si el paso 1 tiene servicio seleccionado", () => {
      expect(puedeNavegarAPaso(2, estadoPaso1Completo)).toBe(true);
    });

    it("bloquea el paso 3 si no se ha completado el paso 2", () => {
      expect(puedeNavegarAPaso(3, estadoPaso1Completo)).toBe(false);
    });

    it("permite el paso 3 cuando los pasos 1 y 2 están completos", () => {
      expect(puedeNavegarAPaso(3, estadoPaso2Completo)).toBe(true);
    });
  });

  describe("determinarEstadoPaso", () => {
    it("devuelve 'activo' para el paso en curso", () => {
      const estado: EstadoCompletoStepper = {
        pasoActual: 2,
        paso1: { servicioId: "srv-1" },
        paso2: {},
        paso3: { nombre: "", email: "" },
      };
      expect(determinarEstadoPaso(2, 2, estado)).toBe("activo");
    });

    it("devuelve 'completado' para pasos previos válidos", () => {
      const estado: EstadoCompletoStepper = {
        pasoActual: 2,
        paso1: { servicioId: "srv-1" },
        paso2: {},
        paso3: { nombre: "", email: "" },
      };
      expect(determinarEstadoPaso(1, 2, estado)).toBe("completado");
    });

    it("devuelve 'bloqueado' si los requisitos previos no se cumplen", () => {
      const estado: EstadoCompletoStepper = {
        pasoActual: 1,
        paso1: {},
        paso2: {},
        paso3: { nombre: "", email: "" },
      };
      expect(determinarEstadoPaso(3, 1, estado)).toBe("bloqueado");
    });
  });

  describe("calcularProgresoPorcentaje", () => {
    it("calcula 33% para paso 1, 66% para paso 2 y 100% para paso 3", () => {
      expect(calcularProgresoPorcentaje(1)).toBe(33);
      expect(calcularProgresoPorcentaje(2)).toBe(66);
      expect(calcularProgresoPorcentaje(3)).toBe(100);
    });
  });

  describe("formatearPrecio", () => {
    it("convierte centavos a formato de moneda con decimales", () => {
      const resultado = formatearPrecio(25000);
      expect(resultado).toContain("250.00");
    });

    it("maneja 0 centavos correctamente", () => {
      const resultado = formatearPrecio(0);
      expect(resultado).toContain("0.00");
    });
  });

  describe("formatearFechaLegible", () => {
    it("devuelve cadena vacía si no hay fecha válida", () => {
      expect(formatearFechaLegible("")).toBe("");
      expect(formatearFechaLegible("invalida")).toBe("");
    });

    it("formatea fecha ISO a texto descriptivo", () => {
      const texto = formatearFechaLegible("2026-10-15");
      expect(texto.toLowerCase()).toContain("octubre");
      expect(texto).toContain("2026");
    });
  });
});
