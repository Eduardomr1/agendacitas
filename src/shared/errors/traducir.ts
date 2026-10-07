import { Failure, crearFailure } from "./failures";

/**
 * Traduce cualquier error arrojado por Postgres o Supabase a un Failure tipado.
 * La UI jamás debe recibir cadenas técnicas crudas.
 */
export function traducirErrorBaseDatos(error: unknown): Failure {
  if (error instanceof Error) {
    const mensaje = error.message.toLowerCase();

    // Detección de colisiones y duplicados (código 23505 o restricciones de exclusión 23P01)
    if (
      mensaje.includes("duplicate key") ||
      mensaje.includes("exclusion constraint") ||
      mensaje.includes("citas_solapadas")
    ) {
      return crearFailure(
        "HORARIO_OCUPADO",
        "El horario seleccionado acaba de ser reservado por otra persona. Por favor elige otro horario.",
        error.message
      );
    }

    // Errores de red o conexión
    if (
      mensaje.includes("econnrefused") ||
      mensaje.includes("etimedout") ||
      mensaje.includes("network") ||
      mensaje.includes("fetch failed")
    ) {
      return crearFailure(
        "SIN_CONEXION",
        "No se pudo establecer conexión con el servidor. Revisa tu acceso a internet.",
        error.message
      );
    }

    // Violaciones de clave foránea o tabla inexistente
    if (mensaje.includes("foreign key") || mensaje.includes("not found")) {
      return crearFailure(
        "RECURSO_NO_ENCONTRADO",
        "El negocio o servicio seleccionado no está disponible.",
        error.message
      );
    }

    return crearFailure(
      "SERVIDOR_NO_DISPONIBLE",
      "Ocurrió un error inesperado al procesar tu solicitud. Intenta más tarde.",
      error.message
    );
  }

  return crearFailure(
    "DESCONOCIDO",
    "Ha ocurrido un error inesperado.",
    String(error)
  );
}
