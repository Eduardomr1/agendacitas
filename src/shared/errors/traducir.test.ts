import { describe, it, expect } from "vitest";
import { traducirErrorBaseDatos } from "./traducir";
import {
  crearFailure,
  esFailureDeReglaNegocio,
  esFailureTransitorio,
} from "./failures";

describe("Traducción de Errores de Base de Datos a Failure", () => {
  it("mapea errores de duplicado o colisión de horarios a HORARIO_OCUPADO", () => {
    const error = new Error(
      "duplicate key value violates unique constraint 'citas_solapadas'"
    );
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("HORARIO_OCUPADO");
    expect(failure.mensajeUsuario).toContain("acaba de ser reservado");
  });

  it("mapea errores estructurados Postgres 23P01 y 40001 de contención concurrente a HORARIO_OCUPADO", () => {
    const exclusionErr = {
      code: "23P01",
      message: "conflicting key value violates exclusion constraint",
      constraint: "citas_rango_excl",
    };
    expect(traducirErrorBaseDatos(exclusionErr).tipo).toBe("HORARIO_OCUPADO");

    const serialErr = {
      code: "40001",
      message: "could not serialize access due to read/write dependencies",
    };
    expect(traducirErrorBaseDatos(serialErr).tipo).toBe("HORARIO_OCUPADO");
  });

  it("mapea duplicados de lista de espera a LISTA_ESPERA_DUPLICADA", () => {
    const error = new Error(
      "duplicate key value violates unique constraint 'lista_espera_unica'"
    );
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("LISTA_ESPERA_DUPLICADA");
    expect(failure.mensajeUsuario).toContain("lista de espera");
  });

  it("mapea conflictos de feriados o bloqueos especiales a FECHA_BLOQUEADA", () => {
    const error = {
      code: "23505",
      message: "violates constraint",
      constraint: "excepciones_fecha_negocio_idx",
    };
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("FECHA_BLOQUEADA");
    expect(failure.mensajeUsuario).toContain("bloqueo o cierre especial");
  });

  it("mapea violaciones CHECK (23514) a DATOS_INVALIDOS", () => {
    const error = {
      code: "23514",
      message: "new row violates check constraint 'duracion_positiva'",
    };
    const failure = traducirErrorBaseDatos(error);

    expect(failure.tipo).toBe("DATOS_INVALIDOS");
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

  it("clasifica correctamente failures transitorios vs reglas de negocio", () => {
    const red = crearFailure("SIN_CONEXION", "Sin red");
    const bloqueada = crearFailure("FECHA_BLOQUEADA", "Feriado oficial");
    const politica = crearFailure("FUERA_VENTANA_POLITICA", "Menos de 24h");

    expect(esFailureTransitorio(red)).toBe(true);
    expect(esFailureDeReglaNegocio(red)).toBe(false);

    expect(esFailureDeReglaNegocio(bloqueada)).toBe(true);
    expect(esFailureDeReglaNegocio(politica)).toBe(true);
    expect(esFailureTransitorio(bloqueada)).toBe(false);
  });
});
