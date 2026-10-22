import { Failure, crearFailure } from "./failures";

interface ErrorEstructuradoSQL {
  code?: string;
  message?: string;
  constraint?: string;
  detail?: string;
}

function esErrorEstructuradoSQL(valor: unknown): valor is ErrorEstructuradoSQL {
  return typeof valor === "object" && valor !== null;
}

function extraerDescriptorError(error: unknown): {
  textoNormalizado: string;
  codigo: string;
  constraint: string;
  detalleCrudo: string;
} | null {
  if (error instanceof Error) {
    const extra: ErrorEstructuradoSQL = esErrorEstructuradoSQL(error) ? error : {};
    const codigo = typeof extra.code === "string" ? extra.code.toUpperCase() : "";
    const constraint =
      typeof extra.constraint === "string" ? extra.constraint.toLowerCase() : "";
    const detalleCrudo = error.message;
    return {
      textoNormalizado: `${detalleCrudo} ${constraint}`.toLowerCase(),
      codigo,
      constraint,
      detalleCrudo,
    };
  }

  if (esErrorEstructuradoSQL(error) && typeof error.message === "string") {
    const codigo = typeof error.code === "string" ? error.code.toUpperCase() : "";
    const constraint =
      typeof error.constraint === "string" ? error.constraint.toLowerCase() : "";
    const detalle = typeof error.detail === "string" ? ` (${error.detail})` : "";
    const detalleCrudo = `${error.message}${detalle}`;
    return {
      textoNormalizado: `${detalleCrudo} ${constraint}`.toLowerCase(),
      codigo,
      constraint,
      detalleCrudo,
    };
  }

  return null;
}

/**
 * Traduce cualquier error arrojado por Postgres o Supabase a un Failure tipado.
 * La UI jamás debe recibir cadenas técnicas crudas.
 */
export function traducirErrorBaseDatos(error: unknown): Failure {
  const descriptor = extraerDescriptorError(error);

  if (descriptor) {
    const { textoNormalizado, codigo, detalleCrudo } = descriptor;

    // 1. Duplicado específico en lista de espera
    if (
      textoNormalizado.includes("lista_espera_unica") ||
      textoNormalizado.includes("waitlist_duplicate")
    ) {
      return crearFailure(
        "LISTA_ESPERA_DUPLICADA",
        "Ya te encuentras registrado en la lista de espera para este servicio y fecha.",
        detalleCrudo
      );
    }

    // 2. Excepción de fecha o feriado bloqueado a nivel base de datos
    if (
      textoNormalizado.includes("excepciones_fecha") ||
      textoNormalizado.includes("fecha_bloqueada")
    ) {
      return crearFailure(
        "FECHA_BLOQUEADA",
        "La fecha seleccionada cuenta con un bloqueo o cierre especial en el calendario.",
        detalleCrudo
      );
    }

    // 3. Colisiones de horario, duplicados (23505), exclusión temporal (23P01) o contención serializable (40001 / 40P01)
    if (
      codigo === "23505" ||
      codigo === "23P01" ||
      codigo === "40001" ||
      codigo === "40P01" ||
      textoNormalizado.includes("duplicate key") ||
      textoNormalizado.includes("exclusion constraint") ||
      textoNormalizado.includes("citas_solapadas") ||
      textoNormalizado.includes("serialization failure") ||
      textoNormalizado.includes("deadlock detected")
    ) {
      return crearFailure(
        "HORARIO_OCUPADO",
        "El horario seleccionado acaba de ser reservado por otra persona. Por favor elige otro horario.",
        detalleCrudo
      );
    }

    // 4. Violación de restricciones CHECK de dominio en base de datos (23514)
    if (codigo === "23514" || textoNormalizado.includes("check constraint")) {
      return crearFailure(
        "DATOS_INVALIDOS",
        "Los datos enviados no cumplen con las reglas de validación del servicio.",
        detalleCrudo
      );
    }

    // 5. Errores de red o conexión
    if (
      textoNormalizado.includes("econnrefused") ||
      textoNormalizado.includes("etimedout") ||
      textoNormalizado.includes("network") ||
      textoNormalizado.includes("fetch failed")
    ) {
      return crearFailure(
        "SIN_CONEXION",
        "No se pudo establecer conexión con el servidor. Revisa tu acceso a internet.",
        detalleCrudo
      );
    }

    // 6. Violaciones de clave foránea (23503) o recurso inexistente
    if (
      codigo === "23503" ||
      textoNormalizado.includes("foreign key") ||
      textoNormalizado.includes("not found")
    ) {
      return crearFailure(
        "RECURSO_NO_ENCONTRADO",
        "El negocio o servicio seleccionado no está disponible.",
        detalleCrudo
      );
    }

    return crearFailure(
      "SERVIDOR_NO_DISPONIBLE",
      "Ocurrió un error inesperado al procesar tu solicitud. Intenta más tarde.",
      detalleCrudo
    );
  }

  return crearFailure(
    "DESCONOCIDO",
    "Ha ocurrido un error inesperado.",
    String(error)
  );
}
