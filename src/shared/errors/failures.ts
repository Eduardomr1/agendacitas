export type TipoFailure =
  | "SIN_CONEXION"
  | "SERVIDOR_NO_DISPONIBLE"
  | "HORARIO_OCUPADO"
  | "FUERA_DE_HORARIO_LABORAL"
  | "FECHA_BLOQUEADA"
  | "FUERA_VENTANA_POLITICA"
  | "LIMITE_REPROGRAMACIONES"
  | "CONFLICTO_SERIE_RECURRENTE"
  | "LISTA_ESPERA_DUPLICADA"
  | "RECURSO_NO_ENCONTRADO"
  | "DATOS_INVALIDOS"
  | "NO_AUTORIZADO"
  | "DESCONOCIDO";

export interface Failure {
  tipo: TipoFailure;
  mensajeUsuario: string;
  detalleTecnico?: string;
}

export const crearFailure = (
  tipo: TipoFailure,
  mensajeUsuario: string,
  detalleTecnico?: string
): Failure => ({
  tipo,
  mensajeUsuario,
  detalleTecnico,
});

const TIPOS_FAILURE_TRANSITORIOS: ReadonlySet<TipoFailure> = new Set([
  "SIN_CONEXION",
  "SERVIDOR_NO_DISPONIBLE",
]);

const TIPOS_FAILURE_REGLA_NEGOCIO: ReadonlySet<TipoFailure> = new Set([
  "HORARIO_OCUPADO",
  "FUERA_DE_HORARIO_LABORAL",
  "FECHA_BLOQUEADA",
  "FUERA_VENTANA_POLITICA",
  "LIMITE_REPROGRAMACIONES",
  "CONFLICTO_SERIE_RECURRENTE",
  "LISTA_ESPERA_DUPLICADA",
  "DATOS_INVALIDOS",
]);

/**
 * Indica si un fallo corresponde a una condición transitoria de infraestructura o red
 * que podría resolverse reintentando la operación.
 */
export function esFailureTransitorio(failure: Failure): boolean {
  return TIPOS_FAILURE_TRANSITORIOS.has(failure.tipo);
}

/**
 * Indica si un fallo proviene de una validación o invariante del dominio de negocio.
 */
export function esFailureDeReglaNegocio(failure: Failure): boolean {
  return TIPOS_FAILURE_REGLA_NEGOCIO.has(failure.tipo);
}
