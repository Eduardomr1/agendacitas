export interface IntervaloMinutos {
  inicioMin: number; // Ej. 540 para 09:00 (9 * 60)
  finMin: number;    // Ej. 1080 para 18:00 (18 * 60)
}

export interface CitaExistenteMinutos {
  inicioMin: number;
  finMin: number;
}

// Re-exportar el motor completo de dominio para máxima interoperabilidad
export * from "@/features/reservas/domain/motorDisponibilidad";

import {
  horaAMinutos as horaAMinutosMotor,
  minutosAHora as minutosAHoraMotor,
  calcularSlotsDisponibles,
} from "@/features/reservas/domain/motorDisponibilidad";

export const horaAMinutos = horaAMinutosMotor;
export const minutosAHora = minutosAHoraMotor;

/**
 * Genera todos los slots libres disponibles para un servicio de duración específica,
 * evitando cualquier choque con citas ya existentes.
 * (Mantenido para compatibilidad con código existente).
 */
export function calcularHorariosDisponibles(
  horarioLaboral: IntervaloMinutos,
  citasExistentes: CitaExistenteMinutos[],
  duracionServicioMin: number,
  pasoMin: number = 30
): string[] {
  return calcularSlotsDisponibles({
    horarioAtencion: {
      abre: minutosAHora(horarioLaboral.inicioMin),
      cierra: minutosAHora(horarioLaboral.finMin),
      activo: true,
    },
    duracionServicioMin,
    pasoMin,
    citasExistentes: citasExistentes.map((c) => ({
      inicio: minutosAHora(c.inicioMin),
      fin: minutosAHora(c.finMin),
    })),
  });
}
