import { HorarioDiaConfig, IntervaloHorario, RecesoConfig } from "./entities";

/**
 * Expresión regular para validar formato HH:MM en 24 horas (00:00 - 23:59).
 */
export const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valida si un string cumple el formato estricto de hora "HH:MM" de 24 horas.
 */
export function esFormatoHoraValido(hora: string): boolean {
  if (!hora || typeof hora !== "string") return false;
  return REGEX_HORA.test(hora.trim());
}

/**
 * Convierte una hora en formato "HH:MM" a minutos transcurridos desde medianoche (0 - 1439).
 * Lanza un error si el formato es inválido.
 */
export function horaAMinutos(hora: string): number {
  if (!esFormatoHoraValido(hora)) {
    throw new Error(`Formato de hora inválido: "${hora}". Debe ser "HH:MM" en formato 24 horas.`);
  }
  const [h, m] = hora.trim().split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convierte una cantidad de minutos desde medianoche a formato string "HH:MM".
 */
export function minutosAHora(minutos: number): string {
  if (isNaN(minutos) || minutos < 0) return "00:00";
  const mNormalizados = Math.floor(minutos) % 1440;
  const h = Math.floor(mNormalizados / 60);
  const m = mNormalizados % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Convierte un formato "HH:MM" de 24 horas a un formato amigable de 12 horas con AM/PM.
 * Ej: "09:00" -> "9:00 AM", "14:30" -> "2:30 PM", "00:00" -> "12:00 AM".
 */
export function formatearHora12(hora: string): string {
  if (!esFormatoHoraValido(hora)) return hora;
  const [hStr, mStr] = hora.split(":");
  let h = parseInt(hStr, 10);
  const sufijo = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${sufijo}`;
}

/**
 * Valida que un intervalo de horas tenga un formato correcto y que la hora de inicio
 * sea estrictamente anterior a la hora de fin (inicio < fin).
 */
export function validarIntervalo(
  inicio: string,
  fin: string
): { valido: boolean; error?: string } {
  if (!esFormatoHoraValido(inicio)) {
    return {
      valido: false,
      error: `La hora de inicio "${inicio}" tiene un formato inválido. Debe ser HH:MM.`,
    };
  }

  if (!esFormatoHoraValido(fin)) {
    return {
      valido: false,
      error: `La hora de fin "${fin}" tiene un formato inválido. Debe ser HH:MM.`,
    };
  }

  const inicioMin = horaAMinutos(inicio);
  const finMin = horaAMinutos(fin);

  if (inicioMin >= finMin) {
    return {
      valido: false,
      error: `La hora de inicio (${inicio}) debe ser estrictamente anterior a la hora de fin (${fin}).`,
    };
  }

  return { valido: true };
}

/**
 * Valida que un intervalo de descanso (receso / lunch break) sea coherente con
 * el horario general de atención de la empresa:
 * 1. El receso debe tener inicio < fin.
 * 2. El receso no puede iniciar antes de la apertura.
 * 3. El receso no puede terminar después del cierre.
 * 4. El receso no puede abarcar la totalidad del horario de apertura.
 */
export function validarRecesoConHorario(
  apertura: string,
  cierre: string,
  receso: { inicio: string; fin: string }
): { valido: boolean; error?: string } {
  const checkHorario = validarIntervalo(apertura, cierre);
  if (!checkHorario.valido) {
    return {
      valido: false,
      error: `Horario laboral inválido: ${checkHorario.error}`,
    };
  }

  const checkReceso = validarIntervalo(receso.inicio, receso.fin);
  if (!checkReceso.valido) {
    return {
      valido: false,
      error: `Intervalo de descanso inválido: ${checkReceso.error}`,
    };
  }

  const aperturaMin = horaAMinutos(apertura);
  const cierreMin = horaAMinutos(cierre);
  const recesoInicioMin = horaAMinutos(receso.inicio);
  const recesoFinMin = horaAMinutos(receso.fin);

  if (recesoInicioMin < aperturaMin) {
    return {
      valido: false,
      error: `El descanso (${receso.inicio}) no puede comenzar antes de la hora de apertura (${apertura}).`,
    };
  }

  if (recesoFinMin > cierreMin) {
    return {
      valido: false,
      error: `El descanso (${receso.fin}) no puede finalizar después de la hora de cierre (${cierre}).`,
    };
  }

  if (recesoInicioMin <= aperturaMin && recesoFinMin >= cierreMin) {
    return {
      valido: false,
      error: "El intervalo de descanso no puede ocupar toda la jornada laboral.",
    };
  }

  return { valido: true };
}

/**
 * Determina si dos intervalos de horario se traslapan o solapan entre sí.
 * Dos intervalos colisionan si max(inicioA, inicioB) < min(finA, finB).
 * (Intervalos continuos como [09:00 - 13:00] y [13:00 - 18:00] no se consideran solapados).
 */
export function haySolapamientoIntervalos(
  a: IntervaloHorario,
  b: IntervaloHorario
): boolean {
  if (
    !esFormatoHoraValido(a.inicio) ||
    !esFormatoHoraValido(a.fin) ||
    !esFormatoHoraValido(b.inicio) ||
    !esFormatoHoraValido(b.fin)
  ) {
    return false;
  }

  const aIni = horaAMinutos(a.inicio);
  const aFin = horaAMinutos(a.fin);
  const bIni = horaAMinutos(b.inicio);
  const bFin = horaAMinutos(b.fin);

  return Math.max(aIni, bIni) < Math.min(aFin, bFin);
}

/**
 * Valida un arreglo de intervalos asegurando que cada uno sea válido y que ninguno
 * se solape con los demás.
 */
export function validarIntervalosSinSolapamiento(
  intervalos: IntervaloHorario[]
): { valido: boolean; error?: string } {
  for (let i = 0; i < intervalos.length; i++) {
    const check = validarIntervalo(intervalos[i].inicio, intervalos[i].fin);
    if (!check.valido) {
      return {
        valido: false,
        error: `Intervalo ${i + 1} (${intervalos[i].inicio} - ${intervalos[i].fin}): ${check.error}`,
      };
    }
  }

  for (let i = 0; i < intervalos.length; i++) {
    for (let j = i + 1; j < intervalos.length; j++) {
      if (haySolapamientoIntervalos(intervalos[i], intervalos[j])) {
        return {
          valido: false,
          error: `Existe un solapamiento entre el intervalo ${intervalos[i].inicio}-${intervalos[i].fin} y el intervalo ${intervalos[j].inicio}-${intervalos[j].fin}.`,
        };
      }
    }
  }

  return { valido: true };
}

export interface ValidacionHorarioDiaResultado {
  valido: boolean;
  errores: {
    apertura?: string;
    cierre?: string;
    receso?: string;
  };
}

/**
 * Valida la configuración completa de un día laboral:
 * - Si está inactivo/cerrado, es válido de inmediato.
 * - Si está activo, valida apertura/cierre y el receso (si está configurado y activo).
 */
export function validarHorarioDia(
  horario: HorarioDiaConfig
): ValidacionHorarioDiaResultado {
  const errores: ValidacionHorarioDiaResultado["errores"] = {};

  if (!horario.activo) {
    return { valido: true, errores: {} };
  }

  const checkAperturaCierre = validarIntervalo(horario.apertura, horario.cierre);
  if (!checkAperturaCierre.valido) {
    if (!esFormatoHoraValido(horario.apertura)) {
      errores.apertura = "Hora de apertura inválida (HH:MM).";
    }
    if (!esFormatoHoraValido(horario.cierre)) {
      errores.cierre = "Hora de cierre inválida (HH:MM).";
    }
    if (
      esFormatoHoraValido(horario.apertura) &&
      esFormatoHoraValido(horario.cierre)
    ) {
      errores.cierre = checkAperturaCierre.error;
    }
  }

  if (horario.receso && horario.receso.activo) {
    const resReceso = validarRecesoConHorario(
      horario.apertura,
      horario.cierre,
      horario.receso
    );
    if (!resReceso.valido) {
      errores.receso = resReceso.error;
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Valida la semana completa de horarios y retorna los errores indexados por día de semana.
 */
export function validarSemanaHorarios(
  horarios: HorarioDiaConfig[]
): {
  valido: boolean;
  erroresPorDia: Record<number, ValidacionHorarioDiaResultado["errores"]>;
} {
  const erroresPorDia: Record<number, ValidacionHorarioDiaResultado["errores"]> = {};
  let todoValido = true;

  for (const h of horarios) {
    const res = validarHorarioDia(h);
    if (!res.valido) {
      todoValido = false;
      erroresPorDia[h.diaSemana] = res.errores;
    }
  }

  return {
    valido: todoValido,
    erroresPorDia,
  };
}

/**
 * Calcula los minutos efectivos de atención disponibles en un día,
 * restando el tiempo de descanso si está activo.
 */
export function calcularMinutosTrabajo(horario: HorarioDiaConfig): number {
  if (!horario.activo) return 0;

  try {
    const aperturaMin = horaAMinutos(horario.apertura);
    const cierreMin = horaAMinutos(horario.cierre);
    if (aperturaMin >= cierreMin) return 0;

    let total = cierreMin - aperturaMin;

    if (horario.receso && horario.receso.activo) {
      const recesoIni = horaAMinutos(horario.receso.inicio);
      const recesoFin = horaAMinutos(horario.receso.fin);
      if (recesoIni < recesoFin && recesoIni >= aperturaMin && recesoFin <= cierreMin) {
        total -= recesoFin - recesoIni;
      }
    }

    return Math.max(0, total);
  } catch {
    return 0;
  }
}

/**
 * Calcula el total de horas semanales de atención para una lista de configuración de días.
 */
export function calcularHorasSemanalesTotales(horarios: HorarioDiaConfig[]): number {
  const totalMinutos = horarios.reduce(
    (acc, dia) => acc + calcularMinutosTrabajo(dia),
    0
  );
  return Math.round((totalMinutos / 60) * 10) / 10;
}

/**
 * Cuenta la cantidad de días abiertos y cerrados configurados.
 */
export function contarDiasAbiertos(
  horarios: HorarioDiaConfig[]
): { abiertos: number; cerrados: number } {
  const abiertos = horarios.filter((h) => h.activo).length;
  return {
    abiertos,
    cerrados: horarios.length - abiertos,
  };
}

/**
 * Divide el horario laboral de un día en los turnos efectivos de atención.
 * Si hay un descanso activo dentro del horario, retorna dos turnos:
 * [ { inicio: apertura, fin: receso.inicio }, { inicio: receso.fin, fin: cierre } ]
 * Si no hay receso, retorna un solo turno continuo.
 * Si el día está cerrado, retorna arreglo vacío.
 */
export function obtenerTurnosEfectivos(
  horario: HorarioDiaConfig
): IntervaloHorario[] {
  if (!horario.activo) return [];

  const validacion = validarHorarioDia(horario);
  if (!validacion.valido) return [];

  if (horario.receso && horario.receso.activo) {
    const turnos: IntervaloHorario[] = [];
    if (horario.apertura !== horario.receso.inicio) {
      turnos.push({ inicio: horario.apertura, fin: horario.receso.inicio });
    }
    if (horario.receso.fin !== horario.cierre) {
      turnos.push({ inicio: horario.receso.fin, fin: horario.cierre });
    }
    return turnos;
  }

  return [{ inicio: horario.apertura, fin: horario.cierre }];
}

/**
 * Genera un texto resumen amigable para un día configurado.
 * Ej: "09:00 - 18:00 (Receso: 14:00 - 15:00)" o "Cerrado".
 */
export function formatearResumenHorarioDia(horario: HorarioDiaConfig): string {
  if (!horario.activo) return "Cerrado";
  let texto = `${horario.apertura} - ${horario.cierre}`;
  if (horario.receso && horario.receso.activo) {
    texto += ` (Receso: ${horario.receso.inicio} - ${horario.receso.fin})`;
  }
  return texto;
}

/**
 * Metadatos de orden laboral para días de la semana (Lunes a Domingo).
 */
export interface InfoDiaSemana {
  diaSemana: number;
  nombre: string;
  corto: string;
  esFinDeSemana: boolean;
}

export const DIAS_SEMANA_INFO: InfoDiaSemana[] = [
  { diaSemana: 1, nombre: "Lunes", corto: "Lun", esFinDeSemana: false },
  { diaSemana: 2, nombre: "Martes", corto: "Mar", esFinDeSemana: false },
  { diaSemana: 3, nombre: "Miércoles", corto: "Mié", esFinDeSemana: false },
  { diaSemana: 4, nombre: "Jueves", corto: "Jue", esFinDeSemana: false },
  { diaSemana: 5, nombre: "Viernes", corto: "Vie", esFinDeSemana: false },
  { diaSemana: 6, nombre: "Sábado", corto: "Sáb", esFinDeSemana: true },
  { diaSemana: 0, nombre: "Domingo", corto: "Dom", esFinDeSemana: true },
];

/**
 * Genera los 7 días de la semana con configuración predeterminada estándar:
 * - Lunes a Viernes: 09:00 a 18:00 con descanso de 14:00 a 15:00 (activo)
 * - Sábado: 09:00 a 14:00 sin descanso (activo)
 * - Domingo: Cerrado
 */
export function generarHorariosPorDefecto(): HorarioDiaConfig[] {
  return DIAS_SEMANA_INFO.map((dia) => {
    if (dia.diaSemana === 0) {
      // Domingo
      return {
        diaSemana: 0,
        nombreDia: "Domingo",
        activo: false,
        apertura: "09:00",
        cierre: "14:00",
        receso: {
          activo: false,
          inicio: "12:00",
          fin: "13:00",
        },
      };
    }

    if (dia.diaSemana === 6) {
      // Sábado
      return {
        diaSemana: 6,
        nombreDia: "Sábado",
        activo: true,
        apertura: "09:00",
        cierre: "14:00",
        receso: {
          activo: false,
          inicio: "12:00",
          fin: "13:00",
        },
      };
    }

    // Lunes a Viernes
    return {
      diaSemana: dia.diaSemana,
      nombreDia: dia.nombre,
      activo: true,
      apertura: "09:00",
      cierre: "18:00",
      receso: {
        activo: true,
        inicio: "14:00",
        fin: "15:00",
      },
    };
  });
}
