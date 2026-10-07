export type TipoFailure =
  | "SIN_CONEXION"
  | "SERVIDOR_NO_DISPONIBLE"
  | "HORARIO_OCUPADO"
  | "FUERA_DE_HORARIO_LABORAL"
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
