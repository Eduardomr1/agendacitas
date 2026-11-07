/**
 * Motor de Asignación Inteligente de Especialistas y Recursos
 *
 * Módulo de dominio para la distribución óptima de citas entre el personal disponible,
 * validando certificaciones por servicio, disponibilidad de agenda individual,
 * límites de carga diaria y estrategias de balanceo (Preferencia, Round-Robin, Menor Carga y Máxima Eficiencia).
 */

export type EstrategiaAsignacion =
  | 'ROUND_ROBIN'
  | 'PREFERENCIA_CLIENTE'
  | 'MAXIMA_EFICIENCIA'
  | 'MENOR_CARGA';

export interface BloqueoCitaEspecialista {
  readonly inicio: string | Date;
  readonly fin: string | Date;
  readonly estado?: string;
}

export interface HorarioJornadaEspecialista {
  readonly abre: string; // "HH:MM"
  readonly cierra: string; // "HH:MM"
  readonly activo?: boolean;
}

export interface Especialista {
  readonly id: string;
  readonly nombre: string;
  readonly activo: boolean;
  readonly serviciosHabilitados: readonly string[]; // IDs de servicios
  readonly horarioPorDia?: Record<number, HorarioJornadaEspecialista>; // 0 = Domingo, 1 = Lunes, etc.
  readonly citasAgendadas?: readonly BloqueoCitaEspecialista[];
  readonly maxCitasDiarias?: number;
  readonly pesoPrioridad?: number; // Para desempates
}

export interface SolicitudAsignacionEspecialista {
  readonly servicioId: string;
  readonly fecha: string; // "YYYY-MM-DD"
  readonly horaInicio: string; // "HH:MM"
  readonly duracionMin: number;
  readonly especialistaPreferidoId?: string;
  readonly estrategia?: EstrategiaAsignacion;
}

export interface AsignacionEspecialistaResultado {
  readonly asignado: boolean;
  readonly especialistaId: string | null;
  readonly especialistaNombre: string | null;
  readonly estrategiaAplicada: EstrategiaAsignacion;
  readonly candidatosAptosCount: number;
  readonly motivoRechazo?: string;
  readonly alternativasDisponibles: readonly {
    readonly especialistaId: string;
    readonly especialistaNombre: string;
    readonly cargaActual: number;
  }[];
}

function minutosDesdeMedianoche(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatearMinutos(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMin % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function parseHoraMinutos(val: string | Date): number {
  if (typeof val === 'string') {
    if (val.includes('T')) {
      const d = new Date(val);
      return d.getHours() * 60 + d.getMinutes();
    }
    return minutosDesdeMedianoche(val);
  }
  return val.getHours() * 60 + val.getMinutes();
}

export class MotorAsignacionEspecialistas {
  /**
   * Filtra especialistas con estado activo y capacitados para el servicio.
   */
  public static filtrarCapacitados(
    servicioId: string,
    especialistas: readonly Especialista[]
  ): Especialista[] {
    return especialistas.filter(
      (esp) => esp.activo && esp.serviciosHabilitados.includes(servicioId)
    );
  }

  /**
   * Evalúa si un especialista tiene disponibilidad temporal y de jornada para el slot.
   */
  public static verificarDisponibilidadSlot(
    especialista: Especialista,
    fechaStr: string,
    horaInicio: string,
    duracionMin: number
  ): boolean {
    if (!especialista.activo) return false;

    const fecha = new Date(`${fechaStr}T00:00:00`);
    const diaSemana = fecha.getDay();

    // 1. Validar jornada laboral
    if (especialista.horarioPorDia) {
      const jornada = especialista.horarioPorDia[diaSemana];
      if (!jornada || jornada.activo === false) {
        return false;
      }
      const slotInicioMin = minutosDesdeMedianoche(horaInicio);
      const slotFinMin = slotInicioMin + duracionMin;
      const jornadaAbreMin = minutosDesdeMedianoche(jornada.abre);
      const jornadaCierraMin = minutosDesdeMedianoche(jornada.cierra);

      if (slotInicioMin < jornadaAbreMin || slotFinMin > jornadaCierraMin) {
        return false;
      }
    }

    // 2. Validar límite de citas diarias si está configurado
    const citasActivasDelDia = (especialista.citasAgendadas ?? []).filter((c) => {
      if (c.estado === 'cancelada' || c.estado === 'cancelado') return false;
      if (typeof c.inicio === 'string' && c.inicio.startsWith(fechaStr)) return true;
      if (c.inicio instanceof Date) {
        const iso = c.inicio.toISOString().slice(0, 10);
        return iso === fechaStr;
      }
      return true;
    });

    if (
      especialista.maxCitasDiarias !== undefined &&
      citasActivasDelDia.length >= especialista.maxCitasDiarias
    ) {
      return false;
    }

    // 3. Validar solapamiento con citas existentes
    const slotInicioMin = minutosDesdeMedianoche(horaInicio);
    const slotFinMin = slotInicioMin + duracionMin;

    for (const cita of citasActivasDelDia) {
      const citaInicioMin = parseHoraMinutos(cita.inicio);
      const citaFinMin = parseHoraMinutos(cita.fin);

      // Solapamiento: [slotInicio, slotFin) intersecta [citaInicio, citaFin)
      if (Math.max(slotInicioMin, citaInicioMin) < Math.min(slotFinMin, citaFinMin)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Asigna el especialista idóneo según la estrategia elegida y restricciones operativas.
   */
  public static asignar(
    solicitud: SolicitudAsignacionEspecialista,
    especialistas: readonly Especialista[]
  ): AsignacionEspecialistaResultado {
    const estrategia = solicitud.estrategia ?? 'PREFERENCIA_CLIENTE';

    // 1. Filtrar capacitados
    const capacitados = this.filtrarCapacitados(solicitud.servicioId, especialistas);
    if (capacitados.length === 0) {
      return {
        asignado: false,
        especialistaId: null,
        especialistaNombre: null,
        estrategiaAplicada: estrategia,
        candidatosAptosCount: 0,
        motivoRechazo: `No hay especialistas capacitados ni activos para el servicio "${solicitud.servicioId}".`,
        alternativasDisponibles: [],
      };
    }

    // 2. Filtrar disponibles para el slot
    const disponibles = capacitados.filter((esp) =>
      this.verificarDisponibilidadSlot(
        esp,
        solicitud.fecha,
        solicitud.horaInicio,
        solicitud.duracionMin
      )
    );

    if (disponibles.length === 0) {
      return {
        asignado: false,
        especialistaId: null,
        especialistaNombre: null,
        estrategiaAplicada: estrategia,
        candidatosAptosCount: 0,
        motivoRechazo: 'Todos los especialistas capacitados presentan colisión de horario o cupo completo.',
        alternativasDisponibles: [],
      };
    }

    // Helper de carga diaria
    const getCarga = (esp: Especialista): number => {
      return (esp.citasAgendadas ?? []).filter((c) => {
        if (c.estado === 'cancelada' || c.estado === 'cancelado') return false;
        if (typeof c.inicio === 'string') return c.inicio.startsWith(solicitud.fecha);
        if (c.inicio instanceof Date) return c.inicio.toISOString().slice(0, 10) === solicitud.fecha;
        return true;
      }).length;
    };

    let seleccionado: Especialista | null = null;

    // 3. Aplicar estrategia de selección
    if (estrategia === 'PREFERENCIA_CLIENTE' && solicitud.especialistaPreferidoId) {
      const matchPreferido = disponibles.find(
        (esp) => esp.id === solicitud.especialistaPreferidoId
      );
      if (matchPreferido) {
        seleccionado = matchPreferido;
      }
    }

    if (!seleccionado) {
      if (estrategia === 'MENOR_CARGA' || estrategia === 'ROUND_ROBIN' || estrategia === 'PREFERENCIA_CLIENTE') {
        // Ordenar por menor cantidad de citas del día; desempate por pesoPrioridad descendente
        const sorted = [...disponibles].sort((a, b) => {
          const diffCarga = getCarga(a) - getCarga(b);
          if (diffCarga !== 0) return diffCarga;
          return (b.pesoPrioridad ?? 0) - (a.pesoPrioridad ?? 0);
        });
        seleccionado = sorted[0] ?? null;
      } else if (estrategia === 'MAXIMA_EFICIENCIA') {
        // Agrupar citas consecutivas: priorizar especialista cuya cita previa termine más cerca del inicio
        const slotInicioMin = minutosDesdeMedianoche(solicitud.horaInicio);
        const sorted = [...disponibles].sort((a, b) => {
          const gapA = this.calcularGapPrevio(a, solicitud.fecha, slotInicioMin);
          const gapB = this.calcularGapPrevio(b, solicitud.fecha, slotInicioMin);
          return gapA - gapB;
        });
        seleccionado = sorted[0] ?? null;
      }
    }

    if (!seleccionado) {
      seleccionado = disponibles[0] ?? null;
    }

    const alternativas = disponibles
      .filter((esp) => esp.id !== seleccionado?.id)
      .map((esp) => ({
        especialistaId: esp.id,
        especialistaNombre: esp.nombre,
        cargaActual: getCarga(esp),
      }));

    return {
      asignado: true,
      especialistaId: seleccionado.id,
      especialistaNombre: seleccionado.nombre,
      estrategiaAplicada: estrategia,
      candidatosAptosCount: disponibles.length,
      alternativasDisponibles: alternativas,
    };
  }

  private static calcularGapPrevio(esp: Especialista, fechaStr: string, slotInicioMin: number): number {
    const citas = (esp.citasAgendadas ?? [])
      .filter((c) => c.estado !== 'cancelada' && c.estado !== 'cancelado')
      .map((c) => parseHoraMinutos(c.fin))
      .filter((finMin) => finMin <= slotInicioMin);

    if (citas.length === 0) return 9999; // Sin citas previas adyacentes
    const maxFin = Math.max(...citas);
    return slotInicioMin - maxFin;
  }
}
