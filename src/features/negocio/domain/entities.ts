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
