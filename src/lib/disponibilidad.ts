export interface IntervaloMinutos {
  inicioMin: number; // Ej. 540 para 09:00 (9 * 60)
  finMin: number;    // Ej. 1080 para 18:00 (18 * 60)
}

export interface CitaExistenteMinutos {
  inicioMin: number;
  finMin: number;
}

/**
 * Convierte formato "HH:MM" a minutos desde medianoche (0 a 1439).
 */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convierte minutos desde medianoche a formato "HH:MM".
 */
export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Genera todos los slots libres disponibles para un servicio de duración específica,
 * evitando cualquier choque con citas ya existentes.
 */
export function calcularHorariosDisponibles(
  horarioLaboral: IntervaloMinutos,
  citasExistentes: CitaExistenteMinutos[],
  duracionServicioMin: number,
  pasoMin: number = 30
): string[] {
  const slotsDisponibles: string[] = [];

  for (
    let actual = horarioLaboral.inicioMin;
    actual + duracionServicioMin <= horarioLaboral.finMin;
    actual += pasoMin
  ) {
    const slotFin = actual + duracionServicioMin;

    // Verificar si el slot choca con alguna cita existente
    // Choque: (slotInicio < citaFin) && (slotFin > citaInicio)
    const hayConflicto = citasExistentes.some(
      (cita) => actual < cita.finMin && slotFin > cita.inicioMin
    );

    if (!hayConflicto) {
      slotsDisponibles.push(minutosAHora(actual));
    }
  }

  return slotsDisponibles;
}
