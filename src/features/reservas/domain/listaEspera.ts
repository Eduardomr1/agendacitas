/**
 * Motor Determinístico de Lista de Espera y Emparejamiento ante Huecos Liberados.
 *
 * Evalúa compatibilidad de duración, franjas horarias, prioridad operativa y antigüedad
 * FIFO sin efectos secundarios ni dependencia del reloj del sistema.
 */

import { horaAMinutos, minutosAHora } from "./motorDisponibilidad";

export type FranjaPreferidaEspera = "manana" | "tarde" | "noche" | "cualquiera";

export type EstadoEntradaListaEspera =
  | "activa"
  | "notificada"
  | "convertida"
  | "expirada"
  | "cancelada";

export interface RangoHorarioPreferido {
  inicio: string; // "HH:MM"
  fin: string; // "HH:MM"
}

export interface EntradaListaEspera {
  id: string;
  negocioId: string;
  servicioId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  fechaDeseada: string; // "YYYY-MM-DD"
  franjaPreferida: FranjaPreferidaEspera;
  rangoHorarioPreferido?: RangoHorarioPreferido;
  duracionRequeridaMin: number;
  /** Nivel de prioridad operativa: 0 = estándar, 1 = preferente, 2 = urgente/reubicación */
  prioridadManual?: number;
  creadaEn: Date;
  estado: EstadoEntradaListaEspera;
}

export interface NuevaEntradaListaEsperaInput {
  negocioId: string;
  servicioId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  fechaDeseada: string;
  franjaPreferida: FranjaPreferidaEspera;
  rangoHorarioPreferido?: RangoHorarioPreferido;
  duracionRequeridaMin: number;
  prioridadManual?: number;
}

export interface HuecoLiberado {
  negocioId: string;
  servicioId?: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  bufferDisponibleDespuesMin?: number;
}

export interface DesglosePuntajeListaEspera {
  coincidenciaHorario: number;
  prioridadManual: number;
  coincidenciaServicio: number;
  antiguedadFIFO: number;
}

export interface CandidatoListaEsperaEvaluado {
  entrada: EntradaListaEspera;
  puntajeTotal: number;
  desglosePuntaje: DesglosePuntajeListaEspera;
  horaInicioSugerida: string;
  horaFinSugerida: string;
}

export interface OpcionesSeleccionListaEspera {
  /** Si es true, solo considera candidatos inscritos al mismo servicio de la cita liberada */
  requerirMismoServicio?: boolean;
  /** Si es true, incluye con menor puntaje entradas cuya franja no coincide con el hueco */
  incluirFranjasNoCoincidentes?: boolean;
  /** Buffer posterior en minutos requerido por el servicio del candidato */
  bufferServicioMin?: number;
  /** Límite máximo de candidatos sugeridos a retornar */
  limiteCandidatos?: number;
  /** Instante de referencia opcional para puntuar horas de espera acumuladas */
  ahoraReferencia?: Date;
}

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRANJAS_VALIDAS: ReadonlySet<FranjaPreferidaEspera> = new Set([
  "manana",
  "tarde",
  "noche",
  "cualquiera",
]);

function esFechaValida(fecha: string): boolean {
  if (!REGEX_FECHA_ISO.test(fecha.trim())) {
    return false;
  }
  const [anio, mes, dia] = fecha.trim().split("-").map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    utc.getUTCFullYear() === anio &&
    utc.getUTCMonth() === mes - 1 &&
    utc.getUTCDate() === dia
  );
}

/**
 * Clasifica una hora "HH:MM" dentro de las tres franjas operativas del día:
 * - manana: 00:00 a 11:59
 * - tarde:  12:00 a 17:59
 * - noche:  18:00 a 23:59
 */
export function obtenerFranjaDeHora(
  hora: string
): Exclude<FranjaPreferidaEspera, "cualquiera"> {
  const minutos = horaAMinutos(hora);
  if (minutos < 12 * 60) {
    return "manana";
  }
  if (minutos < 18 * 60) {
    return "tarde";
  }
  return "noche";
}

/**
 * Valida las invariantes de dominio para inscribir a un cliente en lista de espera.
 */
export function validarEntradaListaEspera(
  input: NuevaEntradaListaEsperaInput
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (!input.negocioId || !input.negocioId.trim()) {
    errores.push("El identificador del negocio es obligatorio.");
  }

  if (!input.servicioId || !input.servicioId.trim()) {
    errores.push("El identificador del servicio es obligatorio.");
  }

  if (!input.clienteNombre || input.clienteNombre.trim().length < 2) {
    errores.push("El nombre del cliente debe contener al menos 2 caracteres.");
  }

  if (!input.clienteEmail || !REGEX_EMAIL.test(input.clienteEmail.trim())) {
    errores.push("El correo electrónico del cliente no es válido.");
  }

  if (!input.fechaDeseada || !esFechaValida(input.fechaDeseada)) {
    errores.push("La fecha deseada debe tener un formato YYYY-MM-DD válido.");
  }

  if (!FRANJAS_VALIDAS.has(input.franjaPreferida)) {
    errores.push("La franja horaria preferida no es válida.");
  }

  if (
    !Number.isFinite(input.duracionRequeridaMin) ||
    input.duracionRequeridaMin <= 0
  ) {
    errores.push("La duración requerida del servicio debe ser mayor a 0 minutos.");
  }

  if (input.rangoHorarioPreferido) {
    const { inicio, fin } = input.rangoHorarioPreferido;
    if (!REGEX_HORA_HHMM.test(inicio) || !REGEX_HORA_HHMM.test(fin)) {
      errores.push(
        "El rango horario preferido debe expresarse en formato HH:MM válido."
      );
    } else {
      const iniMin = horaAMinutos(inicio);
      const finMin = horaAMinutos(fin);
      if (iniMin >= finMin) {
        errores.push(
          "La hora de inicio del rango preferido debe ser anterior a la hora de fin."
        );
      } else if (finMin - iniMin < input.duracionRequeridaMin) {
        errores.push(
          "El rango horario preferido es más corto que la duración requerida del servicio."
        );
      }
    }
  }

  if (
    input.prioridadManual !== undefined &&
    (!Number.isInteger(input.prioridadManual) ||
      input.prioridadManual < 0 ||
      input.prioridadManual > 2)
  ) {
    errores.push("La prioridad manual debe ser un entero entre 0 y 2.");
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Detecta si el cliente ya cuenta con un registro vigente ("activa" o "notificada")
 * para el mismo negocio, servicio y fecha deseada (insensible a mayúsculas en email).
 */
export function detectarDuplicadoListaEspera(
  entradasExistentes: EntradaListaEspera[],
  candidata: Pick<
    NuevaEntradaListaEsperaInput,
    "negocioId" | "servicioId" | "clienteEmail" | "fechaDeseada"
  >
): boolean {
  const emailNormalizado = candidata.clienteEmail.trim().toLowerCase();
  const fechaNormalizada = candidata.fechaDeseada.trim();

  return entradasExistentes.some((existente) => {
    if (existente.estado !== "activa" && existente.estado !== "notificada") {
      return false;
    }

    return (
      existente.negocioId === candidata.negocioId &&
      existente.servicioId === candidata.servicioId &&
      existente.fechaDeseada.trim() === fechaNormalizada &&
      existente.clienteEmail.trim().toLowerCase() === emailNormalizado
    );
  });
}

/**
 * Selecciona y ordena determinísticamente los mejores candidatos de la lista de espera
 * capaces de aprovechar un hueco liberado tras una cancelación o reprogramación.
 */
export function seleccionarCandidatosListaEspera(
  hueco: HuecoLiberado,
  entradas: EntradaListaEspera[],
  opciones: OpcionesSeleccionListaEspera = {}
): CandidatoListaEsperaEvaluado[] {
  const huecoInicioMin = horaAMinutos(hueco.horaInicio);
  const huecoFinMin = horaAMinutos(hueco.horaFin);
  const bufferHuecoExtra = Math.max(0, hueco.bufferDisponibleDespuesMin ?? 0);
  const huecoFinConBuffer = huecoFinMin + bufferHuecoExtra;
  const bufferRequerido = Math.max(0, opciones.bufferServicioMin ?? 0);

  if (huecoFinMin <= huecoInicioMin) {
    return [];
  }

  const preseleccion: Array<{
    entrada: EntradaListaEspera;
    inicioSugeridoMin: number;
    finSugeridoMin: number;
    coincidenciaHorario: number;
  }> = [];

  for (const entrada of entradas) {
    if (entrada.estado !== "activa") {
      continue;
    }

    if (
      entrada.negocioId !== hueco.negocioId ||
      entrada.fechaDeseada.trim() !== hueco.fecha.trim() ||
      entrada.duracionRequeridaMin <= 0
    ) {
      continue;
    }

    if (
      opciones.requerirMismoServicio &&
      hueco.servicioId &&
      entrada.servicioId !== hueco.servicioId
    ) {
      continue;
    }

    if (entrada.rangoHorarioPreferido) {
      const rangoIni = horaAMinutos(entrada.rangoHorarioPreferido.inicio);
      const rangoFin = horaAMinutos(entrada.rangoHorarioPreferido.fin);
      const inicioOptimo = Math.max(huecoInicioMin, rangoIni);
      const finServicio = inicioOptimo + entrada.duracionRequeridaMin;
      const finLimite = Math.min(huecoFinMin, rangoFin);

      if (
        finServicio > finLimite ||
        finServicio + bufferRequerido > huecoFinConBuffer
      ) {
        continue;
      }

      preseleccion.push({
        entrada,
        inicioSugeridoMin: inicioOptimo,
        finSugeridoMin: finServicio,
        coincidenciaHorario: 40,
      });
      continue;
    }

    const inicioOptimo = huecoInicioMin;
    const finServicio = inicioOptimo + entrada.duracionRequeridaMin;

    if (
      finServicio > huecoFinMin ||
      finServicio + bufferRequerido > huecoFinConBuffer
    ) {
      continue;
    }

    const franjaHueco = obtenerFranjaDeHora(minutosAHora(inicioOptimo));
    let coincidenciaHorario = 0;

    if (entrada.franjaPreferida === franjaHueco) {
      coincidenciaHorario = 30;
    } else if (entrada.franjaPreferida === "cualquiera") {
      coincidenciaHorario = 15;
    } else if (opciones.incluirFranjasNoCoincidentes) {
      coincidenciaHorario = 0;
    } else {
      continue;
    }

    preseleccion.push({
      entrada,
      inicioSugeridoMin: inicioOptimo,
      finSugeridoMin: finServicio,
      coincidenciaHorario,
    });
  }

  if (preseleccion.length === 0) {
    return [];
  }

  // Referencia determinística para puntuar antigüedad sin usar Date.now()
  const referenciaTiempoMs = opciones.ahoraReferencia
    ? opciones.ahoraReferencia.getTime()
    : Math.max(...preseleccion.map((item) => item.entrada.creadaEn.getTime()));

  const evaluados: CandidatoListaEsperaEvaluado[] = preseleccion.map((item) => {
    const nivelPrioridad = Math.min(
      2,
      Math.max(0, Math.floor(item.entrada.prioridadManual ?? 0))
    );
    const prioridadManual = nivelPrioridad * 30;

    const coincidenciaServicio =
      hueco.servicioId && item.entrada.servicioId === hueco.servicioId ? 15 : 0;

    const horasEspera = Math.max(
      0,
      Math.floor(
        (referenciaTiempoMs - item.entrada.creadaEn.getTime()) / 3_600_000
      )
    );
    const antiguedadFIFO = Math.min(25, horasEspera);

    const puntajeTotal =
      item.coincidenciaHorario +
      prioridadManual +
      coincidenciaServicio +
      antiguedadFIFO;

    return {
      entrada: item.entrada,
      puntajeTotal,
      desglosePuntaje: {
        coincidenciaHorario: item.coincidenciaHorario,
        prioridadManual,
        coincidenciaServicio,
        antiguedadFIFO,
      },
      horaInicioSugerida: minutosAHora(item.inicioSugeridoMin),
      horaFinSugerida: minutosAHora(item.finSugeridoMin),
    };
  });

  evaluados.sort((a, b) => {
    if (b.puntajeTotal !== a.puntajeTotal) {
      return b.puntajeTotal - a.puntajeTotal;
    }

    const diffTiempo =
      a.entrada.creadaEn.getTime() - b.entrada.creadaEn.getTime();
    if (diffTiempo !== 0) {
      return diffTiempo;
    }

    return a.entrada.id.localeCompare(b.entrada.id);
  });

  if (opciones.limiteCandidatos !== undefined && opciones.limiteCandidatos > 0) {
    return evaluados.slice(0, opciones.limiteCandidatos);
  }

  return evaluados;
}
