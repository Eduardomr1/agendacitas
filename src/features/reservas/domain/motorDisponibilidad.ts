/**
 * Motor de Generación y Cálculo de Slots de Disponibilidad
 *
 * Módulo puro de dominio para calcular horarios disponibles de atención,
 * considerando horarios de apertura/cierre, duración de servicio, descansos
 * (lunch break / pausas), buffers de preparación/limpieza y citas agendadas.
 */

export interface HorarioAtencionDia {
  abre: string; // Formato "HH:MM" (ej. "09:00")
  cierra: string; // Formato "HH:MM" (ej. "18:00")
  activo?: boolean; // Si es false, el negocio está cerrado ese día
}

export interface LunchBreak {
  inicio: string; // Formato "HH:MM" (ej. "14:00")
  fin: string; // Formato "HH:MM" (ej. "15:00")
}

export interface CitaOcupada {
  inicio: string | Date; // "HH:MM", ISO Date string o Date object
  fin: string | Date; // "HH:MM", ISO Date string o Date object
  estado?: string; // Si es "cancelada" o "cancelado", no bloquea
}

export interface BufferPreparacionConfig {
  antesMin?: number; // Minutos de preparación antes de iniciar el servicio
  despuesMin?: number; // Minutos de limpieza/preparación tras finalizar el servicio
}

export interface CalcularSlotsParams {
  horarioAtencion?: HorarioAtencionDia | null;
  horarioLaboral?: HorarioAtencionDia | null; // Alias
  duracionServicioMin?: number;
  intervaloServicioMin?: number; // Alias
  duracionMin?: number; // Alias
  bufferPreparacionMin?: number | BufferPreparacionConfig;
  bufferMin?: number; // Alias
  lunchBreak?: LunchBreak | null;
  descansos?: LunchBreak[];
  citasExistentes?: CitaOcupada[];
  citas?: CitaOcupada[]; // Alias
  pasoMin?: number; // Intervalo de inicio entre slots (default: 30)
  bufferIncluidoEnJornada?: boolean; // Si true, el buffer post-servicio debe caber antes de cierra (default: false)
}

export interface SlotDetallado {
  horaInicio: string; // "09:00"
  horaFin: string; // "09:30"
  inicioMin: number;
  finMin: number;
  disponible: boolean;
}

/**
 * Convierte un formato "HH:MM", número de minutos o Date a minutos desde medianoche (0 a 1439).
 */
export function horaAMinutos(hora: string | number | Date): number {
  if (typeof hora === "number") {
    return Math.floor(hora);
  }

  if (hora instanceof Date) {
    return hora.getUTCHours() * 60 + hora.getUTCMinutes();
  }

  if (typeof hora === "string") {
    // Si contiene "T", intentar parsear como ISO Date
    if (hora.includes("T")) {
      const d = new Date(hora);
      if (!isNaN(d.getTime())) {
        return d.getUTCHours() * 60 + d.getUTCMinutes();
      }
    }

    const partes = hora.trim().split(":");
    const h = parseInt(partes[0], 10) || 0;
    const m = parseInt(partes[1], 10) || 0;
    return h * 60 + m;
  }

  return 0;
}

/**
 * Convierte minutos desde medianoche (ej. 540) a formato "HH:MM" (ej. "09:00").
 */
export function minutosAHora(minutos: number): string {
  const normalizados = ((Math.floor(minutos) % 1440) + 1440) % 1440;
  const h = Math.floor(normalizados / 60);
  const m = normalizados % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Función pura que calcula los slots de horarios disponibles para un día dado,
 * excluyendo colisiones con citas previas, descansos (lunch break) y respetando
 * el buffer de preparación y límites de jornada laboral.
 */
export function calcularSlotsDisponibles(params: CalcularSlotsParams): string[];
export function calcularSlotsDisponibles(
  horarioAtencion: HorarioAtencionDia | null | undefined,
  duracionServicioMin: number,
  bufferPreparacionMin?: number | BufferPreparacionConfig,
  lunchBreak?: LunchBreak | null,
  citasExistentes?: CitaOcupada[],
  pasoMin?: number
): string[];
export function calcularSlotsDisponibles(
  paramsOPrimerArg: CalcularSlotsParams | HorarioAtencionDia | null | undefined,
  duracionServicioMinArg?: number,
  bufferPreparacionMinArg?: number | BufferPreparacionConfig,
  lunchBreakArg?: LunchBreak | null,
  citasExistentesArg?: CitaOcupada[],
  pasoMinArg?: number
): string[] {
  // Normalizar parámetros según firma (objeto vs argumentos posicionales)
  let horario: HorarioAtencionDia | null | undefined;
  let duracion = 0;
  let bufferConfig: number | BufferPreparacionConfig | undefined;
  let lunch: LunchBreak | null | undefined;
  let pausasAdicionales: LunchBreak[] = [];
  let citas: CitaOcupada[] = [];
  let paso = 30;
  let bufferEnJornada = false;

  const esObjetoParams =
    paramsOPrimerArg !== null &&
    typeof paramsOPrimerArg === "object" &&
    duracionServicioMinArg === undefined &&
    ("duracionServicioMin" in paramsOPrimerArg ||
      "intervaloServicioMin" in paramsOPrimerArg ||
      "duracionMin" in paramsOPrimerArg ||
      "horarioAtencion" in paramsOPrimerArg ||
      "horarioLaboral" in paramsOPrimerArg);

  if (esObjetoParams) {
    const p = paramsOPrimerArg as CalcularSlotsParams;
    horario = p.horarioAtencion ?? p.horarioLaboral;
    duracion = p.duracionServicioMin ?? p.intervaloServicioMin ?? p.duracionMin ?? 0;
    bufferConfig = p.bufferPreparacionMin ?? p.bufferMin;
    lunch = p.lunchBreak;
    pausasAdicionales = p.descansos ?? [];
    citas = p.citasExistentes ?? p.citas ?? [];
    paso = p.pasoMin && p.pasoMin > 0 ? p.pasoMin : 30;
    bufferEnJornada = p.bufferIncluidoEnJornada ?? false;
  } else {
    horario = paramsOPrimerArg as HorarioAtencionDia | null | undefined;
    duracion = duracionServicioMinArg ?? 0;
    bufferConfig = bufferPreparacionMinArg;
    lunch = lunchBreakArg;
    citas = citasExistentesArg ?? [];
    paso = pasoMinArg && pasoMinArg > 0 ? pasoMinArg : 30;
    bufferEnJornada = false;
  }

  // 1. Validar si el día está cerrado o datos insuficientes
  if (!horario || horario.activo === false) {
    return [];
  }

  if (duracion <= 0) {
    return [];
  }

  const jornadaInicio = horaAMinutos(horario.abre);
  const jornadaFin = horaAMinutos(horario.cierra);

  // Si el horario de apertura es posterior o igual al de cierre, no hay jornada
  if (jornadaInicio >= jornadaFin) {
    return [];
  }

  // Si la duración requerida excede la jornada completa, no hay slots posibles
  if (duracion > jornadaFin - jornadaInicio) {
    return [];
  }

  // 2. Descomponer buffer de preparación
  let bufferAntes = 0;
  let bufferDespues = 0;

  if (typeof bufferConfig === "number") {
    bufferDespues = Math.max(0, bufferConfig);
  } else if (typeof bufferConfig === "object" && bufferConfig !== null) {
    bufferAntes = Math.max(0, bufferConfig.antesMin ?? 0);
    bufferDespues = Math.max(0, bufferConfig.despuesMin ?? 0);
  }

  // 3. Normalizar pausas y descansos (Lunch break)
  const descansosMinutos: Array<{ inicioMin: number; finMin: number }> = [];

  if (lunch) {
    const iniL = horaAMinutos(lunch.inicio);
    const finL = horaAMinutos(lunch.fin);
    if (finL > iniL) {
      descansosMinutos.push({ inicioMin: iniL, finMin: finL });
    }
  }

  for (const d of pausasAdicionales) {
    const iniD = horaAMinutos(d.inicio);
    const finD = horaAMinutos(d.fin);
    if (finD > iniD) {
      descansosMinutos.push({ inicioMin: iniD, finMin: finD });
    }
  }

  // 4. Normalizar citas existentes activas (excluir canceladas)
  const citasBloqueantes: Array<{ inicioMin: number; finMin: number }> = [];

  for (const c of citas) {
    const estado = c.estado ? c.estado.toLowerCase().trim() : "confirmada";
    if (estado === "cancelada" || estado === "cancelado") {
      continue;
    }

    const iniC = horaAMinutos(c.inicio);
    const finC = horaAMinutos(c.fin);

    if (finC > iniC) {
      citasBloqueantes.push({ inicioMin: iniC, finMin: finC });
    }
  }

  // 5. Generar slots evaluando colisiones
  const slotsValidos: string[] = [];

  for (
    let actual = jornadaInicio;
    actual + duracion <= jornadaFin;
    actual += paso
  ) {
    const slotInicio = actual;
    const slotFin = slotInicio + duracion;

    // A) Verificar buffer anterior con apertura de jornada
    const slotInicioConBuffer = slotInicio - bufferAntes;
    if (slotInicioConBuffer < jornadaInicio) {
      continue;
    }

    // B) Verificar buffer posterior con cierre de jornada (si está configurado exigirlo dentro)
    const slotFinConBuffer = slotFin + bufferDespues;
    if (bufferEnJornada && slotFinConBuffer > jornadaFin) {
      continue;
    }

    // C) Verificar colisión con descansos / lunch break
    // El servicio (y su buffer necesario) no puede solaparse con el descanso
    const chocaConDescanso = descansosMinutos.some((pausa) => {
      return (
        slotInicioConBuffer < pausa.finMin && slotFinConBuffer > pausa.inicioMin
      );
    });

    if (chocaConDescanso) {
      continue;
    }

    // D) Verificar colisión con citas agendadas
    // Conflicto: la ventana [slotInicio - bufferAntes, slotFin + bufferDespues]
    // no puede solaparse con la cita [cita.inicioMin, cita.finMin + bufferDespues].
    const chocaConCita = citasBloqueantes.some((cita) => {
      const citaEfectivaFin = cita.finMin + bufferDespues;
      const citaEfectivaInicio = cita.inicioMin - bufferAntes;

      return (
        slotInicio < citaEfectivaFin && slotFinConBuffer > citaEfectivaInicio
      );
    });

    if (chocaConCita) {
      continue;
    }

    slotsValidos.push(minutosAHora(slotInicio));
  }

  return slotsValidos;
}

/**
 * Devuelve un desglose detallado de todos los slots evaluados en la jornada,
 * indicando para cada uno si está disponible o no.
 */
export function calcularSlotsDetallados(
  params: CalcularSlotsParams
): SlotDetallado[] {
  const horario = params.horarioAtencion ?? params.horarioLaboral;
  const duracion =
    params.duracionServicioMin ??
    params.intervaloServicioMin ??
    params.duracionMin ??
    0;

  if (!horario || horario.activo === false || duracion <= 0) {
    return [];
  }

  const jornadaInicio = horaAMinutos(horario.abre);
  const jornadaFin = horaAMinutos(horario.cierra);
  const paso = params.pasoMin && params.pasoMin > 0 ? params.pasoMin : 30;

  const disponiblesSet = new Set(calcularSlotsDisponibles(params));
  const detallados: SlotDetallado[] = [];

  for (
    let actual = jornadaInicio;
    actual + duracion <= jornadaFin;
    actual += paso
  ) {
    const horaInicio = minutosAHora(actual);
    detallados.push({
      horaInicio,
      horaFin: minutosAHora(actual + duracion),
      inicioMin: actual,
      finMin: actual + duracion,
      disponible: disponiblesSet.has(horaInicio),
    });
  }

  return detallados;
}
