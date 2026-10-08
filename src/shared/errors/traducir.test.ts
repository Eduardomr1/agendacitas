import { describe, it, expect } from "vitest";
import { traducirErrorBaseDatos } from "./traducir";

describe("Traducción de Errores de Base de Datos a Failure", () => {
  it("mapea errores de duplicado o colisión de horarios a HORARIO_OCUPADO", () => {
    const error = new Error("duplicate key value violates unique constraint 'citas_solapadas'");
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("HORARIO_OCUPADO");
    expect(failure.mensajeUsuario).toContain("acaba de ser reservado");
  });

  it("mapea errores de red o fallo de conexión a SIN_CONEXION", () => {
    const error = new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:5432");
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("SIN_CONEXION");
    expect(failure.mensajeUsuario).toContain("conexión con el servidor");
  });

  it("mapea errores desconocidos de forma segura sin exponer detalles crudos al usuario", () => {
    const error = new Error("syntax error at or near 'SELECT'");
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("SERVIDOR_NO_DISPONIBLE");
    expect(failure.mensajeUsuario).not.toContain("syntax error");
    expect(failure.detalleTecnico).toContain("syntax error");
  });
});
