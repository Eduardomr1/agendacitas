import {
  ExcepcionCalendario,
  HorarioDiaConfig,
  HorarioEfectivoFecha,
  IntervaloHorario,
} from "./entities";
import {
  esFormatoHoraValido,
  haySolapamientoIntervalos,
  horaAMinutos,
  minutosAHora,
  validarIntervalo,
} from "./horariosAtencion";

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida estrictamente que una cadena cumpla el formato YYYY-MM-DD y represente
 * una fecha real del calendario gregoriano (incluyendo años bisiestos).
 */
export function esFechaISOValida(fecha: string): boolean {
  if (!fecha || typeof fecha !== "string" || !REGEX_FECHA_ISO.test(fecha.trim())) {
    return false;
  }

  const [anio, mes, dia] = fecha.trim().split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || anio < 1970 || anio > 2100) {
    return false;
  }

  const utc = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    utc.getUTCFullYear() === anio &&
    utc.getUTCMonth() === mes - 1 &&
    utc.getUTCDate() === dia
  );
}

/**
 * Obtiene el día de la semana (0 = Domingo .. 6 = Sábado) para una fecha YYYY-MM-DD
 * sin sufrir desplazamientos por zona horaria local.
 */
export function obtenerDiaSemanaFechaISO(fecha: string): number {
  if (!esFechaISOValida(fecha)) {
    throw new Error(`Fecha ISO inválida: "${fecha}". Se esperaba YYYY-MM-DD.`);
  }
  const [anio, mes, dia] = fecha.trim().split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/**
 * Determina si una excepción de calendario aplica sobre una fecha específica,
 * considerando coincidencias exactas o feriados anuales recurrentes (MM-DD).
 */
export function coincideExcepcionEnFecha(
  excepcion: ExcepcionCalendario,
  fechaObjetivo: string
): boolean {
  if (!esFechaISOValida(excepcion.fecha) || !esFechaISOValida(fechaObjetivo)) {
    return false;
  }

  const fechaEx = excepcion.fecha.trim();
  const fechaObj = fechaObjetivo.trim();

  if (fechaEx === fechaObj) {
    return true;
  }

  if (excepcion.recurrenteAnual) {
    return fechaEx.slice(5) === fechaObj.slice(5);
  }

  return false;
}

/**
 * Valida las invariantes de dominio de una excepción de calendario antes de persistirla.
 */
export function validarExcepcionCalendario(
  excepcion: Omit<ExcepcionCalendario, "id"> & { id?: string }
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (!excepcion.negocioId || !excepcion.negocioId.trim()) {
    errores.push("El identificador del negocio es obligatorio.");
  }

  if (!esFechaISOValida(excepcion.fecha)) {
    errores.push(`La fecha "${excepcion.fecha}" no es una fecha YYYY-MM-DD válida.`);
  }

  if (!excepcion.motivo || excepcion.motivo.trim().length < 2) {
    errores.push("El motivo de la excepción debe tener al menos 2 caracteres.");
  }

  if (excepcion.tipo === "horario_especial") {
    if (!excepcion.aperturaEspecial || !excepcion.cierreEspecial) {
      errores.push(
        "El horario especial requiere especificar hora de apertura y hora de cierre."
      );
    } else {
      const check = validarIntervalo(
        excepcion.aperturaEspecial,
        excepcion.cierreEspecial
      );
      if (!check.valido && check.error) {
        errores.push(check.error);
      }
    }
  } else if (excepcion.tipo === "bloqueo_parcial") {
    if (!excepcion.bloqueoInicio || !excepcion.bloqueoFin) {
      errores.push(
        "El bloqueo parcial requiere especificar hora de inicio y hora de fin."
      );
    } else {
      const check = validarIntervalo(excepcion.bloqueoInicio, excepcion.bloqueoFin);
      if (!check.valido && check.error) {
        errores.push(check.error);
      }
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Verifica si existen contradicciones o solapamientos entre las excepciones activas
 * en una misma fecha objetivo (por ejemplo, múltiples horarios especiales con igual prioridad
 * o bloqueos parciales superpuestos).
 */
export function detectarConflictosExcepciones(
  excepciones: ExcepcionCalendario[],
  fechaObjetivo: string
): { hayConflicto: boolean; detalle?: string } {
  const aplicables = excepciones.filter((ex) =>
    coincideExcepcionEnFecha(ex, fechaObjetivo)
  );

  if (aplicables.length <= 1) {
    return { hayConflicto: false };
  }

  const especialesExactos = aplicables.filter(
    (ex) => ex.tipo === "horario_especial" && !ex.recurrenteAnual
  );
  if (especialesExactos.length > 1) {
    return {
      hayConflicto: true,
      detalle: `Existen ${especialesExactos.length} horarios especiales exactos definidos para ${fechaObjetivo}.`,
    };
  }

  const especialesAnuales = aplicables.filter(
    (ex) => ex.tipo === "horario_especial" && Boolean(ex.recurrenteAnual)
  );
  if (especialesAnuales.length > 1) {
    return {
      hayConflicto: true,
      detalle: `Existen múltiples horarios especiales anuales definidos para ${fechaObjetivo}.`,
    };
  }

  const bloqueos = aplicables
    .filter(
      (ex) =>
        ex.tipo === "bloqueo_parcial" &&
        Boolean(ex.bloqueoInicio) &&
        Boolean(ex.bloqueoFin)
    )
    .map((ex) => ({
      inicio: ex.bloqueoInicio as string,
      fin: ex.bloqueoFin as string,
    }));

  for (let i = 0; i < bloqueos.length; i++) {
    for (let j = i + 1; j < bloqueos.length; j++) {
      if (haySolapamientoIntervalos(bloqueos[i], bloqueos[j])) {
        return {
          hayConflicto: true,
          detalle: `Los bloqueos parciales ${bloqueos[i].inicio}-${bloqueos[i].fin} y ${bloqueos[j].inicio}-${bloqueos[j].fin} se solapan en ${fechaObjetivo}.`,
        };
      }
    }
  }

  return { hayConflicto: false };
}

/**
 * Resuelve el horario efectivo de operación para una fecha específica combinando
 * el calendario semanal base del negocio con feriados, horarios especiales y bloqueos parciales.
 *
 * Orden de precedencia:
 * 1. Feriado cerrado (fecha exacta > anual recurrente) -> Día cerrado completo.
 * 2. Horario especial (fecha exacta > anual recurrente) -> Reemplaza apertura/cierre del día.
 * 3. Horario semanal base para el día de la semana.
 * 4. Bloqueos parciales aplicables recortados dentro de la ventana operativa resultante.
 */
export function resolverHorarioEfectivoFecha(
  fecha: string,
  horariosSemanales: HorarioDiaConfig[],
  excepciones: ExcepcionCalendario[] = []
): HorarioEfectivoFecha {
  const diaSemana = obtenerDiaSemanaFechaISO(fecha);
  const aplicables = excepciones.filter((ex) => coincideExcepcionEnFecha(ex, fecha));

  // 1. Evaluar cierre por feriado (priorizando fecha exacta sobre recurrente anual)
  const feriadoExacto = aplicables.find(
    (ex) => ex.tipo === "feriado_cerrado" && !ex.recurrenteAnual
  );
  const feriadoAnual = aplicables.find(
    (ex) => ex.tipo === "feriado_cerrado" && Boolean(ex.recurrenteAnual)
  );
  const feriadoActivo = feriadoExacto ?? feriadoAnual;

  if (feriadoActivo) {
    return {
      fecha,
      diaSemana,
      abierto: false,
      apertura: null,
      cierre: null,
      receso: null,
      bloqueosParciales: [],
      motivoExcepcion: feriadoActivo.motivo,
      origen: "feriado_cerrado",
    };
  }

  // 2. Buscar horario especial (fecha exacta tiene precedencia sobre anual)
  const especialExacto = aplicables.find(
    (ex) => ex.tipo === "horario_especial" && !ex.recurrenteAnual
  );
  const especialAnual = aplicables.find(
    (ex) => ex.tipo === "horario_especial" && Boolean(ex.recurrenteAnual)
  );
  const horarioEspecial = especialExacto ?? especialAnual;

  const horarioBase = horariosSemanales.find((h) => h.diaSemana === diaSemana);

  let aperturaEfectiva: string | null = null;
  let cierreEfectivo: string | null = null;
  let recesoEfectivo: IntervaloHorario | null = null;
  let motivoExcepcion: string | undefined;
  let origen: HorarioEfectivoFecha["origen"] = "horario_semanal";

  if (
    horarioEspecial &&
    horarioEspecial.aperturaEspecial &&
    horarioEspecial.cierreEspecial &&
    esFormatoHoraValido(horarioEspecial.aperturaEspecial) &&
    esFormatoHoraValido(horarioEspecial.cierreEspecial) &&
    horaAMinutos(horarioEspecial.aperturaEspecial) <
      horaAMinutos(horarioEspecial.cierreEspecial)
  ) {
    aperturaEfectiva = horarioEspecial.aperturaEspecial;
    cierreEfectivo = horarioEspecial.cierreEspecial;
    motivoExcepcion = horarioEspecial.motivo;
    origen = "horario_especial";

    // Conservar receso semanal únicamente si cabe de forma estricta dentro de la jornada especial
    if (
      horarioBase?.receso?.activo &&
      esFormatoHoraValido(horarioBase.receso.inicio) &&
      esFormatoHoraValido(horarioBase.receso.fin)
    ) {
      const apMin = horaAMinutos(aperturaEfectiva);
      const ciMin = horaAMinutos(cierreEfectivo);
      const reIni = horaAMinutos(horarioBase.receso.inicio);
      const reFin = horaAMinutos(horarioBase.receso.fin);

      if (reIni > apMin && reFin < ciMin && reIni < reFin) {
        recesoEfectivo = {
          inicio: horarioBase.receso.inicio,
          fin: horarioBase.receso.fin,
        };
      }
    }
  } else if (horarioBase && horarioBase.activo) {
    aperturaEfectiva = horarioBase.apertura;
    cierreEfectivo = horarioBase.cierre;
    origen = "horario_semanal";

    if (
      horarioBase.receso?.activo &&
      esFormatoHoraValido(horarioBase.receso.inicio) &&
      esFormatoHoraValido(horarioBase.receso.fin)
    ) {
      recesoEfectivo = {
        inicio: horarioBase.receso.inicio,
        fin: horarioBase.receso.fin,
      };
    }
  } else {
    return {
      fecha,
      diaSemana,
      abierto: false,
      apertura: null,
      cierre: null,
      receso: null,
      bloqueosParciales: [],
      origen: "dia_inactivo",
    };
  }

  const aperturaMin = horaAMinutos(aperturaEfectiva);
  const cierreMin = horaAMinutos(cierreEfectivo);

  // 3. Recolectar y recortar bloqueos parciales aplicables a la jornada efectiva
  const bloqueosParciales: IntervaloHorario[] = [];
  const motivosBloqueo: string[] = motivoExcepcion ? [motivoExcepcion] : [];

  for (const ex of aplicables) {
    if (
      ex.tipo === "bloqueo_parcial" &&
      ex.bloqueoInicio &&
      ex.bloqueoFin &&
      esFormatoHoraValido(ex.bloqueoInicio) &&
      esFormatoHoraValido(ex.bloqueoFin)
    ) {
      const bIni = Math.max(aperturaMin, horaAMinutos(ex.bloqueoInicio));
      const bFin = Math.min(cierreMin, horaAMinutos(ex.bloqueoFin));
      if (bIni < bFin) {
        bloqueosParciales.push({
          inicio: minutosAHora(bIni),
          fin: minutosAHora(bFin),
        });
        if (ex.motivo && !motivosBloqueo.includes(ex.motivo)) {
          motivosBloqueo.push(ex.motivo);
        }
      }
    }
  }

  bloqueosParciales.sort((a, b) => horaAMinutos(a.inicio) - horaAMinutos(b.inicio));

  // Si un bloqueo parcial abarca toda la jornada efectiva, el día queda cerrado en la práctica
  if (
    bloqueosParciales.length === 1 &&
    horaAMinutos(bloqueosParciales[0].inicio) <= aperturaMin &&
    horaAMinutos(bloqueosParciales[0].fin) >= cierreMin
  ) {
    return {
      fecha,
      diaSemana,
      abierto: false,
      apertura: null,
      cierre: null,
      receso: null,
      bloqueosParciales: [],
      motivoExcepcion: motivosBloqueo.join("; ") || undefined,
      origen: "feriado_cerrado",
    };
  }

  return {
    fecha,
    diaSemana,
    abierto: true,
    apertura: aperturaEfectiva,
    cierre: cierreEfectivo,
    receso: recesoEfectivo,
    bloqueosParciales,
    motivoExcepcion: motivosBloqueo.length > 0 ? motivosBloqueo.join("; ") : undefined,
    origen,
  };
}

/**
 * Expande y filtra todas las excepciones que impactan un intervalo cerrado de fechas
 * [fechaInicio, fechaFin] en formato YYYY-MM-DD, proyectando feriados anuales recurrentes.
 */
export function filtrarExcepcionesEnRango(
  excepciones: ExcepcionCalendario[],
  fechaInicio: string,
  fechaFin: string
): Array<{ fechaEfectiva: string; excepcion: ExcepcionCalendario }> {
  if (!esFechaISOValida(fechaInicio) || !esFechaISOValida(fechaFin)) {
    return [];
  }

  if (fechaInicio > fechaFin) {
    return [];
  }

  const anioInicio = Number(fechaInicio.slice(0, 4));
  const anioFin = Number(fechaFin.slice(0, 4));
  const resultados: Array<{ fechaEfectiva: string; excepcion: ExcepcionCalendario }> = [];

  for (const ex of excepciones) {
    if (!esFechaISOValida(ex.fecha)) {
      continue;
    }

    if (!ex.recurrenteAnual) {
      if (ex.fecha >= fechaInicio && ex.fecha <= fechaFin) {
        resultados.push({ fechaEfectiva: ex.fecha, excepcion: ex });
      }
      continue;
    }

    const mesDia = ex.fecha.slice(5);
    for (let anio = anioInicio; anio <= anioFin; anio++) {
      const candidata = `${anio}-${mesDia}`;
      if (
        esFechaISOValida(candidata) &&
        candidata >= fechaInicio &&
        candidata <= fechaFin
      ) {
        resultados.push({ fechaEfectiva: candidata, excepcion: ex });
      }
    }
  }

  resultados.sort((a, b) => a.fechaEfectiva.localeCompare(b.fechaEfectiva));
  return resultados;
}
