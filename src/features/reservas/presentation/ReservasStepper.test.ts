import { describe, it, expect, vi } from "vitest";
import {
  validarPaso1,
  validarPaso2,
  validarPaso3,
  puedeNavegarAPaso,
  determinarEstadoPaso,
  calcularProgresoPorcentaje,
  formatearPrecio,
  formatearFechaLegible,
  EstadoCompletoStepper,
} from "../domain/stepperReserva";

describe("Reservas Stepper - Flujo Completo de Reserva Pública (3 Pasos)", () => {
  const serviciosDemo = [
    {
      id: "srv-1",
      nombre: "Corte de Cabello Tradicional",
      descripcion: "Lavado y peinado incluido",
      duracionMin: 30,
      precioCentavos: 25000,
    },
    {
      id: "srv-2",
      nombre: "Arreglo de Barba",
      descripcion: "Toalla caliente",
      duracionMin: 30,
      precioCentavos: 18000,
    },
  ];

  it("inicia en Paso 1 y bloquea navegación a Paso 2 y 3 sin servicio seleccionado", () => {
    const estadoInicial: EstadoCompletoStepper = {
      pasoActual: 1,
      paso1: { servicioId: undefined },
      paso2: { fecha: undefined, slot: undefined },
      paso3: { nombre: "", email: "" },
    };

    expect(validarPaso1(estadoInicial.paso1).esValido).toBe(false);
    expect(puedeNavegarAPaso(2, estadoInicial)).toBe(false);
    expect(puedeNavegarAPaso(3, estadoInicial)).toBe(false);
    expect(determinarEstadoPaso(1, 1, estadoInicial)).toBe("activo");
    expect(determinarEstadoPaso(2, 1, estadoInicial)).toBe("bloqueado");
    expect(determinarEstadoPaso(3, 1, estadoInicial)).toBe("bloqueado");
    expect(calcularProgresoPorcentaje(1)).toBe(33);
  });

  it("al seleccionar un servicio en Paso 1, valida y desbloquea el avance a Paso 2", () => {
    const estadoConServicio: EstadoCompletoStepper = {
      pasoActual: 1,
      paso1: { servicioId: serviciosDemo[0].id },
      paso2: { fecha: "2026-10-15", slot: undefined },
      paso3: { nombre: "", email: "" },
    };

    expect(validarPaso1(estadoConServicio.paso1).esValido).toBe(true);
    expect(puedeNavegarAPaso(2, estadoConServicio)).toBe(true);
    expect(puedeNavegarAPaso(3, estadoConServicio)).toBe(false); // bloqueado porque aún no hay slot
  });

  it("en Paso 2, bloquea avance a Paso 3 si no hay slot seleccionado", () => {
    const estadoPaso2SinSlot: EstadoCompletoStepper = {
      pasoActual: 2,
      paso1: { servicioId: "srv-1" },
      paso2: { fecha: "2026-10-15", slot: "" },
      paso3: { nombre: "", email: "" },
    };

    const valPaso2 = validarPaso2(estadoPaso2SinSlot.paso2);
    expect(valPaso2.esValido).toBe(false);
    expect(valPaso2.errores.slot).toBe("Selecciona un horario disponible.");
    expect(puedeNavegarAPaso(3, estadoPaso2SinSlot)).toBe(false);
    // Pero siempre permite volver al Paso 1
    expect(puedeNavegarAPaso(1, estadoPaso2SinSlot)).toBe(true);
  });

  it("en Paso 2, valida fecha y slot seleccionados y permite avanzar a Paso 3", () => {
    const estadoPaso2Completo: EstadoCompletoStepper = {
      pasoActual: 2,
      paso1: { servicioId: "srv-1" },
      paso2: { fecha: "2026-10-15", slot: "11:30" },
      paso3: { nombre: "", email: "" },
    };

    const valPaso2 = validarPaso2(estadoPaso2Completo.paso2);
    expect(valPaso2.esValido).toBe(true);
    expect(puedeNavegarAPaso(3, estadoPaso2Completo)).toBe(true);
    expect(determinarEstadoPaso(1, 2, estadoPaso2Completo)).toBe("completado");
    expect(determinarEstadoPaso(2, 2, estadoPaso2Completo)).toBe("activo");
    expect(determinarEstadoPaso(3, 2, estadoPaso2Completo)).toBe("pendiente");
    expect(calcularProgresoPorcentaje(2)).toBe(66);
  });

  it("en Paso 3, valida todos los campos de contacto y notas opcionales", () => {
    const datosInvalidos = {
      nombre: "E",
      email: "invalido@",
      telefono: "123",
      notas: "a".repeat(501),
    };

    const valInvalida = validarPaso3(datosInvalidos);
    expect(valInvalida.esValido).toBe(false);
    expect(valInvalida.errores.nombre).toBe("El nombre debe tener al menos 2 caracteres.");
    expect(valInvalida.errores.email).toBe("Ingresa un correo electrónico válido.");
    expect(valInvalida.errores.telefono).toBe("Ingresa un número telefónico válido (mínimo 7 dígitos).");
    expect(valInvalida.errores.notas).toBe("Las notas no pueden superar los 500 caracteres.");

    const datosValidos = {
      nombre: "Eduardo Maytorena",
      email: "eduardo_maytorenar@outlook.com",
      telefono: "+52 662 123 4567",
      notas: "Corte con tijera arriba y fade a los lados.",
    };

    const valValida = validarPaso3(datosValidos);
    expect(valValida.esValido).toBe(true);
    expect(valValida.errores).toEqual({});
  });

  it("en Paso 3, permite regresar libremente al Paso 2 o Paso 1 sin perder selección", () => {
    const estadoPaso3: EstadoCompletoStepper = {
      pasoActual: 3,
      paso1: { servicioId: "srv-1" },
      paso2: { fecha: "2026-10-15", slot: "10:00" },
      paso3: {
        nombre: "Eduardo Maytorena",
        email: "eduardo@outlook.com",
        telefono: "6621234567",
        notas: "Sin observaciones",
      },
    };

    expect(puedeNavegarAPaso(1, estadoPaso3)).toBe(true);
    expect(puedeNavegarAPaso(2, estadoPaso3)).toBe(true);
    expect(puedeNavegarAPaso(3, estadoPaso3)).toBe(true);

    expect(determinarEstadoPaso(1, 3, estadoPaso3)).toBe("completado");
    expect(determinarEstadoPaso(2, 3, estadoPaso3)).toBe("completado");
    expect(determinarEstadoPaso(3, 3, estadoPaso3)).toBe("activo");
    expect(calcularProgresoPorcentaje(3)).toBe(100);
  });

  it("simula confirmación exitosa y generación del ticket con todos los datos requeridos", async () => {
    const onConfirmarMock = vi.fn().mockResolvedValue(undefined);

    const payload = {
      slot: "16:30",
      nombre: "Eduardo Maytorena",
      email: "eduardo_maytorenar@outlook.com",
      telefono: "+52 662 000 0000",
      notas: "Cliente recurrente",
    };

    await onConfirmarMock(payload);

    expect(onConfirmarMock).toHaveBeenCalledWith({
      slot: "16:30",
      nombre: "Eduardo Maytorena",
      email: "eduardo_maytorenar@outlook.com",
      telefono: "+52 662 000 0000",
      notas: "Cliente recurrente",
    });

    const precioTexto = formatearPrecio(25000);
    const fechaTexto = formatearFechaLegible("2026-10-15");

    expect(precioTexto).toContain("250.00");
    expect(fechaTexto.toLowerCase()).toContain("octubre");
  });
});
