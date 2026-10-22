export interface NegocioConfig {
  id: string;
  ownerId: string;
  slug: string;
  nombre: string;
  zonaHoraria: string;
}

export interface ActualizarNegocioInput {
  nombre: string;
  slug: string;
  zonaHoraria: string;
}

export interface IntervaloHorario {
  inicio: string; // "HH:MM", ej. "09:00"
  fin: string;    // "HH:MM", ej. "18:00"
}

export interface RecesoConfig {
  activo: boolean;
  inicio: string; // "HH:MM", ej. "14:00"
  fin: string;    // "HH:MM", ej. "15:00"
}

export interface HorarioDiaConfig {
  diaSemana: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  nombreDia: string; // "Lunes", "Martes", etc.
  activo: boolean;   // true = Abierto, false = Cerrado
  apertura: string;  // "09:00"
  cierre: string;    // "18:00"
  receso?: RecesoConfig; // Intervalo de descanso (lunch break)
}

export type TipoExcepcionCalendario =
  | "feriado_cerrado"
  | "horario_especial"
  | "bloqueo_parcial";

export interface ExcepcionCalendario {
  id: string;
  negocioId: string;
  fecha: string; // Formato "YYYY-MM-DD"
  tipo: TipoExcepcionCalendario;
  motivo: string;
  recurrenteAnual?: boolean; // Si es true, aplica cada año en el mismo MM-DD
  aperturaEspecial?: string; // Requerido si tipo === "horario_especial"
  cierreEspecial?: string;   // Requerido si tipo === "horario_especial"
  bloqueoInicio?: string;    // Requerido si tipo === "bloqueo_parcial"
  bloqueoFin?: string;       // Requerido si tipo === "bloqueo_parcial"
}

export type OrigenHorarioEfectivo =
  | "horario_semanal"
  | "feriado_cerrado"
  | "horario_especial"
  | "dia_inactivo";

export interface HorarioEfectivoFecha {
  fecha: string;
  diaSemana: number;
  abierto: boolean;
  apertura: string | null;
  cierre: string | null;
  receso: IntervaloHorario | null;
  bloqueosParciales: IntervaloHorario[];
  motivoExcepcion?: string;
  origen: OrigenHorarioEfectivo;
}
