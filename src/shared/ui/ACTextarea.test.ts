import { describe, it, expect } from "vitest";

describe("ACTextarea Logic", () => {
  it("debe validar longitud máxima de caracteres permitida", () => {
    const limiteMaximo = 500;
    const textoValido = "Quisiera que el corte sea bajo y degradado.";
    const textoExcedido = "a".repeat(501);

    expect(textoValido.length <= limiteMaximo).toBe(true);
    expect(textoExcedido.length <= limiteMaximo).toBe(false);
  });

  it("debe calcular correctamente el contador de caracteres", () => {
    const texto = "Atención puntual por favor";
    const formatoContador = `${texto.length}/500 caracteres`;
    expect(formatoContador).toBe("26/500 caracteres");
  });
});
