/**
 * Motor de Generación y Cálculo de Slots de Disponibilidad
 *
 * Módulo puro de dominio para calcular horarios disponibles de atención,
 * considerando horarios de apertura/cierre, excepciones de calendario (feriados,
 * horarios especiales, bloqueos parciales), duración de servicio, descansos,
 * buffers asimétricos de preparación/limpieza, ventanas de anticipación y cupos diarios.
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

export interface IntervaloBloqueo {
  inicio: string; // Formato "HH:MM"
  fin: string; // Formato "HH:MM"
  motivo?: string;
}

export interface ExcepcionDisponibilidadDia {
  cerradoCompleto?: boolean; // Feriado o cierre total en la fecha
  abreEspecial?: string; // Sobrescribe hora de apertura si aplica
  cierraEspecial?: string; // Sobrescribe hora de cierre si aplica
  bloqueos?: IntervaloBloqueo[]; // Bloqueos parciales intradía
  motivo?: string;
}

export interface CitaOcupada {
  id?: string; // Identificador opcional (permite excluir auto-colisión al reprogramar)
  inicio: string | Date; // "HH:MM", ISO Date string o Date object
  fin: string | Date; // "HH:MM", ISO Date string o Date object
  estado?: string; // Si es "cancelada" o "cancelado", no bloquea
  bufferAntesMin?: number; // Buffer propio previo de la cita ya agendada
  bufferDespuesMin?: number; // Buffer propio posterior de la cita ya agendada
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
  bloqueosParciales?: IntervaloBloqueo[];
  excepcionFecha?: ExcepcionDisponibilidadDia | null;
  citasExistentes?: CitaOcupada[];
  citas?: CitaOcupada[]; // Alias
  excluirCitaId?: string; // Ignora esta cita (útil para reprogramar sin auto-colisión)
  pasoMin?: number; // Intervalo de inicio entre slots (default: 30)
  bufferIncluidoEnJornada?: boolean; // Si true, el buffer post-servicio debe caber antes de cierra (default: false)
  anticipacionMinimaMin?: number; // Minutos mínimos de anticipación respecto a ahoraReferencia
  anticipacionMaximaDias?: number; // Horizonte máximo en días calendario respecto a ahoraReferencia
  fechaObjetivo?: string; // Fecha del día consultado en formato "YYYY-MM-DD"
  ahoraReferencia?: Date | string; // Instante actual de referencia para reglas de anticipación
  maxCitasDia?: number; // Límite operativo opcional de citas activas permitidas en el día
}

export interface SlotDetallado {
  horaInicio: string; // "09:00"
  horaFin: string; // "09:30"
  inicioMin: number;
  finMin: number;
  disponible: boolean;
}

export type MotivoEstadoSlot =
  | "DISPONIBLE"
  | "DIA_CERRADO"
  | "FERIADO_BLOQUEADO"
  | "FUERA_DE_JORNADA"
  | "EN_DESCANSO"
  | "BLOQUEO_PARCIAL"
  | "COLISION_CITA_O_BUFFER"
  | "ANTICIPACION_INSUFICIENTE"
  | "HORIZONTE_EXCEDIDO"
  | "CUPO_DIARIO_AGOTADO";

export interface DiagnosticoSlot {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
  motivo: MotivoEstadoSlot;
  detalle?: string;
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
 * Evalúa si un slot en una fecha objetivo cumple con la ventana de anticipación
 * mínima (en minutos) y máxima (en días calendario) respecto al instante de referencia.
 */
export function validarVentanaAnticipacion(params: {
  fechaObjetivo?: string;
  slotInicioMin: number;
  ahoraReferencia?: Date | string;
  anticipacionMinimaMin?: number;
  anticipacionMaximaDias?: number;
}): { permitido: boolean; motivo?: "ANTICIPACION_INSUFICIENTE" | "HORIZONTE_EXCEDIDO" } {
  const {
    fechaObjetivo,
    slotInicioMin,
    ahoraReferencia,
    anticipacionMinimaMin,
    anticipacionMaximaDias,
  } = params;

  if (!fechaObjetivo || !ahoraReferencia) {
    return { permitido: true };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaObjetivo.trim())) {
    return { permitido: true };
  }

  const ahoraDate =
    ahoraReferencia instanceof Date ? ahoraReferencia : new Date(ahoraReferencia);
  if (isNaN(ahoraDate.getTime())) {
    return { permitido: true };
  }

  const [anio, mes, dia] = fechaObjetivo.trim().split("-").map(Number);
  const horasSlot = Math.floor(slotInicioMin / 60);
  const minutosSlot = slotInicioMin % 60;

  if (anticipacionMaximaDias !== undefined && anticipacionMaximaDias > 0) {
    const inicioDiaObjetivoMs = Date.UTC(anio, mes - 1, dia);
    const inicioDiaAhoraMs = Date.UTC(
      ahoraDate.getUTCFullYear(),
      ahoraDate.getUTCMonth(),
      ahoraDate.getUTCDate()
    );
    const diasDiferencia = Math.floor(
      (inicioDiaObjetivoMs - inicioDiaAhoraMs) / 86_400_000
    );

    if (diasDiferencia > anticipacionMaximaDias) {
      return { permitido: false, motivo: "HORIZONTE_EXCEDIDO" };
    }
  }

  if (anticipacionMinimaMin !== undefined && anticipacionMinimaMin >= 0) {
    const slotUtcMs = Date.UTC(anio, mes - 1, dia, horasSlot, minutosSlot, 0, 0);
    const diferenciaMin = (slotUtcMs - ahoraDate.getTime()) / 60_000;

    if (diferenciaMin < anticipacionMinimaMin) {
      return { permitido: false, motivo: "ANTICIPACION_INSUFICIENTE" };
    }
  }

  return { permitido: true };
}

interface ContextoJornadaNormalizado {
  cerradoPorFeriado: boolean;
  motivoFeriado?: string;
  cerradoRegular: boolean;
  duracion: number;
  paso: number;
  jornadaInicio: number;
  jornadaFin: number;
  bufferAntes: number;
  bufferDespues: number;
  bufferEnJornada: boolean;
  descansosMinutos: Array<{ inicioMin: number; finMin: number }>;
  bloqueosMinutos: Array<{ inicioMin: number; finMin: number; motivo?: string }>;
  citasBloqueantes: Array<{
    inicioMin: number;
    finMin: number;
    efectivoInicioMin: number;
    efectivoFinMin: number;
  }>;
  cupoDiarioAgotado: boolean;
  fechaObjetivo?: string;
  ahoraReferencia?: Date | string;
  anticipacionMinimaMin?: number;
  anticipacionMaximaDias?: number;
}

function construirContextoJornada(params: CalcularSlotsParams): ContextoJornadaNormalizado {
  const horarioBase = params.horarioAtencion ?? params.horarioLaboral;
  const excepcion = params.excepcionFecha;
  const duracion =
    params.duracionServicioMin ??
    params.intervaloServicioMin ??
    params.duracionMin ??
    0;
  const paso = params.pasoMin && params.pasoMin > 0 ? params.pasoMin : 30;
  const bufferConfig = params.bufferPreparacionMin ?? params.bufferMin;
  const bufferEnJornada = params.bufferIncluidoEnJornada ?? false;

  let bufferAntes = 0;
  let bufferDespues = 0;

  if (typeof bufferConfig === "number") {
    bufferDespues = Math.max(0, bufferConfig);
  } else if (typeof bufferConfig === "object" && bufferConfig !== null) {
    bufferAntes = Math.max(0, bufferConfig.antesMin ?? 0);
    bufferDespues = Math.max(0, bufferConfig.despuesMin ?? 0);
  }

  if (excepcion?.cerradoCompleto) {
    return {
      cerradoPorFeriado: true,
      motivoFeriado: excepcion.motivo,
      cerradoRegular: false,
      duracion,
      paso,
      jornadaInicio: 0,
      jornadaFin: 0,
      bufferAntes,
      bufferDespues,
      bufferEnJornada,
      descansosMinutos: [],
      bloqueosMinutos: [],
      citasBloqueantes: [],
      cupoDiarioAgotado: false,
      fechaObjetivo: params.fechaObjetivo,
      ahoraReferencia: params.ahoraReferencia,
      anticipacionMinimaMin: params.anticipacionMinimaMin,
      anticipacionMaximaDias: params.anticipacionMaximaDias,
    };
  }

  const tieneHorarioEspecial = Boolean(
    excepcion?.abreEspecial && excepcion?.cierraEspecial
  );

  if (!tieneHorarioEspecial && (!horarioBase || horarioBase.activo === false)) {
    return {
      cerradoPorFeriado: false,
      cerradoRegular: true,
      duracion,
      paso,
      jornadaInicio: 0,
      jornadaFin: 0,
      bufferAntes,
      bufferDespues,
      bufferEnJornada,
      descansosMinutos: [],
      bloqueosMinutos: [],
      citasBloqueantes: [],
      cupoDiarioAgotado: false,
      fechaObjetivo: params.fechaObjetivo,
      ahoraReferencia: params.ahoraReferencia,
      anticipacionMinimaMin: params.anticipacionMinimaMin,
      anticipacionMaximaDias: params.anticipacionMaximaDias,
    };
  }

  const abreEfectivo = tieneHorarioEspecial
    ? (excepcion?.abreEspecial as string)
    : (horarioBase?.abre as string);
  const cierraEfectivo = tieneHorarioEspecial
    ? (excepcion?.cierraEspecial as string)
    : (horarioBase?.cierra as string);

  const jornadaInicio = horaAMinutos(abreEfectivo);
  const jornadaFin = horaAMinutos(cierraEfectivo);

  // Descansos (lunch break + descansos adicionales)
  const descansosMinutos: Array<{ inicioMin: number; finMin: number }> = [];
  if (params.lunchBreak) {
    const iniL = horaAMinutos(params.lunchBreak.inicio);
    const finL = horaAMinutos(params.lunchBreak.fin);
    if (finL > iniL) {
      descansosMinutos.push({ inicioMin: iniL, finMin: finL });
    }
  }
  for (const d of params.descansos ?? []) {
    const iniD = horaAMinutos(d.inicio);
    const finD = horaAMinutos(d.fin);
    if (finD > iniD) {
      descansosMinutos.push({ inicioMin: iniD, finMin: finD });
    }
  }

  // Bloqueos parciales intradía (directos + provenientes de excepción de fecha)
  const bloqueosMinutos: Array<{ inicioMin: number; finMin: number; motivo?: string }> = [];
  const listaBloqueos = [
    ...(params.bloqueosParciales ?? []),
    ...(excepcion?.bloqueos ?? []),
  ];
  for (const b of listaBloqueos) {
    const iniB = horaAMinutos(b.inicio);
    const finB = horaAMinutos(b.fin);
    if (finB > iniB) {
      bloqueosMinutos.push({ inicioMin: iniB, finMin: finB, motivo: b.motivo });
    }
  }

  // Citas existentes activas (excluyendo canceladas y excluirCitaId)
  const citasCrudas = params.citasExistentes ?? params.citas ?? [];
  const citasBloqueantes: ContextoJornadaNormalizado["citasBloqueantes"] = [];

  for (const c of citasCrudas) {
    if (params.excluirCitaId && c.id && c.id === params.excluirCitaId) {
      continue;
    }

    const estado = c.estado ? c.estado.toLowerCase().trim() : "confirmada";
    if (estado === "cancelada" || estado === "cancelado") {
      continue;
    }

    const iniC = horaAMinutos(c.inicio);
    const finC = horaAMinutos(c.fin);

    if (finC > iniC) {
      const bufAntesCita =
        c.bufferAntesMin !== undefined ? Math.max(0, c.bufferAntesMin) : bufferAntes;
      const bufDespuesCita =
        c.bufferDespuesMin !== undefined
          ? Math.max(0, c.bufferDespuesMin)
          : bufferDespues;

      citasBloqueantes.push({
        inicioMin: iniC,
        finMin: finC,
        efectivoInicioMin: iniC - bufAntesCita,
        efectivoFinMin: finC + bufDespuesCita,
      });
    }
  }

  const cupoDiarioAgotado =
    params.maxCitasDia !== undefined &&
    params.maxCitasDia > 0 &&
    citasBloqueantes.length >= params.maxCitasDia;

  return {
    cerradoPorFeriado: false,
    cerradoRegular: jornadaInicio >= jornadaFin,
    duracion,
    paso,
    jornadaInicio,
    jornadaFin,
    bufferAntes,
    bufferDespues,
    bufferEnJornada,
    descansosMinutos,
    bloqueosMinutos,
    citasBloqueantes,
    cupoDiarioAgotado,
    fechaObjetivo: params.fechaObjetivo,
    ahoraReferencia: params.ahoraReferencia,
    anticipacionMinimaMin: params.anticipacionMinimaMin,
    anticipacionMaximaDias: params.anticipacionMaximaDias,
  };
}

function evaluarSlotEnContexto(
  slotInicio: number,
  ctx: ContextoJornadaNormalizado
): { disponible: boolean; motivo: MotivoEstadoSlot; detalle?: string } {
  if (ctx.cerradoPorFeriado) {
    return {
      disponible: false,
      motivo: "FERIADO_BLOQUEADO",
      detalle: ctx.motivoFeriado,
    };
  }

  if (ctx.cerradoRegular || ctx.duracion <= 0) {
    return { disponible: false, motivo: "DIA_CERRADO" };
  }

  if (ctx.cupoDiarioAgotado) {
    return { disponible: false, motivo: "CUPO_DIARIO_AGOTADO" };
  }

  const slotFin = slotInicio + ctx.duracion;
  const slotInicioConBuffer = slotInicio - ctx.bufferAntes;
  const slotFinConBuffer = slotFin + ctx.bufferDespues;

  if (
    slotInicio < ctx.jornadaInicio ||
    slotFin > ctx.jornadaFin ||
    slotInicioConBuffer < ctx.jornadaInicio ||
    (ctx.bufferEnJornada && slotFinConBuffer > ctx.jornadaFin)
  ) {
    return { disponible: false, motivo: "FUERA_DE_JORNADA" };
  }

  // Ventana de anticipación mínima y horizonte máximo
  const checkAnticipacion = validarVentanaAnticipacion({
    fechaObjetivo: ctx.fechaObjetivo,
    slotInicioMin: slotInicio,
    ahoraReferencia: ctx.ahoraReferencia,
    anticipacionMinimaMin: ctx.anticipacionMinimaMin,
    anticipacionMaximaDias: ctx.anticipacionMaximaDias,
  });

  if (!checkAnticipacion.permitido && checkAnticipacion.motivo) {
    return { disponible: false, motivo: checkAnticipacion.motivo };
  }

  // Colisión con descansos (lunch break / pausas)
  const chocaConDescanso = ctx.descansosMinutos.some(
    (pausa) =>
      slotInicioConBuffer < pausa.finMin && slotFinConBuffer > pausa.inicioMin
  );
  if (chocaConDescanso) {
    return { disponible: false, motivo: "EN_DESCANSO" };
  }

  // Colisión con bloqueos parciales intradía
  const bloqueoColisionado = ctx.bloqueosMinutos.find(
    (b) => slotInicioConBuffer < b.finMin && slotFinConBuffer > b.inicioMin
  );
  if (bloqueoColisionado) {
    return {
      disponible: false,
      motivo: "BLOQUEO_PARCIAL",
      detalle: bloqueoColisionado.motivo,
    };
  }

  // Colisión con citas existentes y sus buffers asimétricos
  const chocaConCita = ctx.citasBloqueantes.some(
    (cita) =>
      slotInicioConBuffer < cita.efectivoFinMin &&
      slotFinConBuffer > cita.efectivoInicioMin
  );
  if (chocaConCita) {
    return { disponible: false, motivo: "COLISION_CITA_O_BUFFER" };
  }

  return { disponible: true, motivo: "DISPONIBLE" };
}

/**
 * Evalúa diagnósticamente un horario puntual ("HH:MM") devolviendo si es reservable
 * y la causa exacta de dominio en caso de bloqueo.
 */
export function evaluarDisponibilidadSlotEspecifico(
  horaSlot: string,
  params: CalcularSlotsParams
): DiagnosticoSlot {
  const ctx = construirContextoJornada(params);
  const slotInicio = horaAMinutos(horaSlot);
  const duracionSegura = Math.max(0, ctx.duracion);
  const resultado = evaluarSlotEnContexto(slotInicio, ctx);

  return {
    horaInicio: minutosAHora(slotInicio),
    horaFin: minutosAHora(slotInicio + duracionSegura),
    disponible: resultado.disponible,
    motivo: resultado.motivo,
    detalle: resultado.detalle,
  };
}

/**
 * Función pura que calcula los slots de horarios disponibles para un día dado,
 * excluyendo colisiones con citas previas, descansos, bloqueos parciales, feriados,
 * ventanas de anticipación y respetando buffers asimétricos y límites de jornada.
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
  const esObjetoParams =
    paramsOPrimerArg !== null &&
    typeof paramsOPrimerArg === "object" &&
    duracionServicioMinArg === undefined &&
    ("duracionServicioMin" in paramsOPrimerArg ||
      "intervaloServicioMin" in paramsOPrimerArg ||
      "duracionMin" in paramsOPrimerArg ||
      "horarioAtencion" in paramsOPrimerArg ||
      "horarioLaboral" in paramsOPrimerArg ||
      "excepcionFecha" in paramsOPrimerArg);

  const paramsNormalizados: CalcularSlotsParams = esObjetoParams
    ? (paramsOPrimerArg as CalcularSlotsParams)
    : {
        horarioAtencion: paramsOPrimerArg as HorarioAtencionDia | null | undefined,
        duracionServicioMin: duracionServicioMinArg ?? 0,
        bufferPreparacionMin: bufferPreparacionMinArg,
        lunchBreak: lunchBreakArg,
        citasExistentes: citasExistentesArg ?? [],
        pasoMin: pasoMinArg && pasoMinArg > 0 ? pasoMinArg : 30,
        bufferIncluidoEnJornada: false,
      };

  const ctx = construirContextoJornada(paramsNormalizados);

  if (
    ctx.cerradoPorFeriado ||
    ctx.cerradoRegular ||
    ctx.duracion <= 0 ||
    ctx.cupoDiarioAgotado ||
    ctx.duracion > ctx.jornadaFin - ctx.jornadaInicio
  ) {
    return [];
  }

  const slotsValidos: string[] = [];

  for (
    let actual = ctx.jornadaInicio;
    actual + ctx.duracion <= ctx.jornadaFin;
    actual += ctx.paso
  ) {
    const evalSlot = evaluarSlotEnContexto(actual, ctx);
    if (evalSlot.disponible) {
      slotsValidos.push(minutosAHora(actual));
    }
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
  const ctx = construirContextoJornada(params);

  if (
    ctx.cerradoPorFeriado ||
    ctx.cerradoRegular ||
    ctx.duracion <= 0 ||
    ctx.duracion > ctx.jornadaFin - ctx.jornadaInicio
  ) {
    return [];
  }

  const disponiblesSet = new Set(calcularSlotsDisponibles(params));
  const detallados: SlotDetallado[] = [];

  for (
    let actual = ctx.jornadaInicio;
    actual + ctx.duracion <= ctx.jornadaFin;
    actual += ctx.paso
  ) {
    const horaInicio = minutosAHora(actual);
    detallados.push({
      horaInicio,
      horaFin: minutosAHora(actual + ctx.duracion),
      inicioMin: actual,
      finMin: actual + ctx.duracion,
      disponible: disponiblesSet.has(horaInicio),
    });
  }

  return detallados;
}
