/**
 * Motor Puro de Políticas de Cancelación, Penalizaciones Escalonadas
 * y Elegibilidad de Reprogramación.
 *
 * Evalúa invariantes temporales, cargos en centavos y límites de cambios de horario
 * sin acoplamiento a base de datos ni interfaz gráfica.
 */

import {
  horaAMinutos,
  type CitaOcupada,
  type HorarioAtencionDia,
} from "./motorDisponibilidad";

export interface TramoPenalizacionCancelacion {
  /** Horas mínimas antes del inicio de la cita para aplicar este tramo */
  horasAntesMin: number;
  /** Porcentaje de cargo sobre el precio del servicio (0 a 100) */
  porcentajeCargo: number;
}

export interface PoliticaCancelacionConfig {
  /** Horas de anticipación para cancelar con 0% de penalización */
  horasAnticipacionGratuita: number;
  /** Ventana mínima en horas antes de la cita para permitir cancelación en línea */
  horasMinimasCancelacion: number;
  /** Porcentaje de penalización por defecto cuando se cancela fuera del plazo gratuito (0 a 100) */
  porcentajePenalizacionTardia: number;
  /** Esquema opcional de penalización escalonada según horas restantes */
  tramosPenalizacion?: TramoPenalizacionCancelacion[];
  /** Si es true, impide cancelar cuando faltan menos de horasMinimasCancelacion */
  bloquearCancelacionTardia?: boolean;
  /** Horas mínimas antes de la cita original requeridas para solicitar reprogramación */
  horasMinimasReprogramacion: number;
  /** Número máximo de reprogramaciones permitidas por reserva */
  maxReprogramacionesPermitidas: number;
}

export interface CitaEvaluacionPolitica {
  id: string;
  inicio: Date;
  fin: Date;
  estado: string;
  precioCentavos: number;
  reprogramacionesRealizadas?: number;
}

export type MotivoRechazoCancelacion =
  | "CITA_YA_CANCELADA"
  | "CITA_COMPLETADA"
  | "CITA_PASADA_O_EN_CURSO"
  | "DENTRO_VENTANA_BLOQUEO";

export interface ResultadoEvaluacionCancelacion {
  permitida: boolean;
  esGratuita: boolean;
  horasRestantes: number;
  fechaLimiteGratuita: Date;
  porcentajePenalizacion: number;
  montoPenalizacionCentavos: number;
  montoReembolsoCentavos: number;
  motivoRechazo?: MotivoRechazoCancelacion;
}

export type MotivoRechazoReprogramacion =
  | "CITA_NO_ACTIVA"
  | "CITA_PASADA_O_EN_CURSO"
  | "LIMITE_REPROGRAMACIONES_ALCANZADO"
  | "FUERA_DE_VENTANA_MINIMA"
  | "MISMO_HORARIO_ORIGINAL";

export interface ResultadoElegibilidadReprogramacion {
  elegible: boolean;
  horasRestantesActual: number;
  reprogramacionesRestantes: number;
  fechaLimiteReprogramacion: Date;
  motivoRechazo?: MotivoRechazoReprogramacion;
}

const MS_POR_HORA = 3_600_000;

export const POLITICA_CANCELACION_POR_DEFECTO: Readonly<PoliticaCancelacionConfig> = {
  horasAnticipacionGratuita: 24,
  horasMinimasCancelacion: 2,
  porcentajePenalizacionTardia: 50,
  bloquearCancelacionTardia: false,
  horasMinimasReprogramacion: 4,
  maxReprogramacionesPermitidas: 2,
};

/**
 * Valida la consistencia matemática y de dominio de una configuración de política.
 */
export function validarConfiguracionPolitica(
  config: PoliticaCancelacionConfig
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (config.horasAnticipacionGratuita < 0) {
    errores.push("Las horas de anticipación gratuita no pueden ser negativas.");
  }

  if (config.horasMinimasCancelacion < 0) {
    errores.push("Las horas mínimas de cancelación no pueden ser negativas.");
  }

  if (config.horasMinimasCancelacion > config.horasAnticipacionGratuita) {
    errores.push(
      "La ventana mínima de cancelación no puede superar las horas de anticipación gratuita."
    );
  }

  if (
    config.porcentajePenalizacionTardia < 0 ||
    config.porcentajePenalizacionTardia > 100
  ) {
    errores.push(
      "El porcentaje de penalización tardía debe encontrarse entre 0 y 100."
    );
  }

  if (config.horasMinimasReprogramacion < 0) {
    errores.push("Las horas mínimas para reprogramar no pueden ser negativas.");
  }

  if (
    config.maxReprogramacionesPermitidas < 0 ||
    !Number.isInteger(config.maxReprogramacionesPermitidas)
  ) {
    errores.push(
      "El máximo de reprogramaciones permitidas debe ser un número entero mayor o igual a 0."
    );
  }

  if (config.tramosPenalizacion && config.tramosPenalizacion.length > 0) {
    const umbralesVistos = new Set<number>();

    for (const tramo of config.tramosPenalizacion) {
      if (tramo.horasAntesMin < 0) {
        errores.push("Los umbrales de horas en tramos de penalización no pueden ser negativos.");
      }
      if (tramo.porcentajeCargo < 0 || tramo.porcentajeCargo > 100) {
        errores.push("El porcentaje de cargo en cada tramo debe estar entre 0 y 100.");
      }
      if (umbralesVistos.has(tramo.horasAntesMin)) {
        errores.push(
          `Existe un tramo de penalización duplicado para ${tramo.horasAntesMin} horas.`
        );
      }
      umbralesVistos.add(tramo.horasAntesMin);
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Calcula el instante límite exacto hasta el cual una cita puede cancelarse sin penalización.
 */
export function calcularFechaLimiteCancelacionGratuita(
  inicioCita: Date,
  horasAnticipacionGratuita: number
): Date {
  const horasSeguras = Math.max(0, horasAnticipacionGratuita);
  return new Date(inicioCita.getTime() - horasSeguras * MS_POR_HORA);
}

/**
 * Determina el porcentaje de cargo aplicable según las horas restantes antes de la cita
 * y los tramos escalonados configurados.
 */
export function resolverPorcentajePenalizacion(
  horasRestantes: number,
  politica: PoliticaCancelacionConfig
): number {
  if (horasRestantes >= politica.horasAnticipacionGratuita) {
    return 0;
  }

  if (politica.tramosPenalizacion && politica.tramosPenalizacion.length > 0) {
    const ordenadosDesc = [...politica.tramosPenalizacion].sort(
      (a, b) => b.horasAntesMin - a.horasAntesMin
    );

    const tramoAplicable = ordenadosDesc.find(
      (tramo) => horasRestantes >= tramo.horasAntesMin
    );

    if (tramoAplicable) {
      return Math.min(100, Math.max(0, tramoAplicable.porcentajeCargo));
    }
  }

  return Math.min(100, Math.max(0, politica.porcentajePenalizacionTardia));
}

/**
 * Evalúa si una cita puede ser cancelada en el instante `ahora`, calculando
 * con precisión en centavos la penalización y el monto reembolsable.
 */
export function evaluarCancelacionCita(
  cita: CitaEvaluacionPolitica,
  politica: PoliticaCancelacionConfig,
  ahora: Date
): ResultadoEvaluacionCancelacion {
  const precioSeguro = Math.max(0, Math.round(cita.precioCentavos));
  const horasRestantes = (cita.inicio.getTime() - ahora.getTime()) / MS_POR_HORA;
  const fechaLimiteGratuita = calcularFechaLimiteCancelacionGratuita(
    cita.inicio,
    politica.horasAnticipacionGratuita
  );

  const estadoNormalizado = cita.estado.trim().toLowerCase();

  if (estadoNormalizado === "cancelada" || estadoNormalizado === "cancelado") {
    return {
      permitida: false,
      esGratuita: false,
      horasRestantes,
      fechaLimiteGratuita,
      porcentajePenalizacion: 0,
      montoPenalizacionCentavos: 0,
      montoReembolsoCentavos: 0,
      motivoRechazo: "CITA_YA_CANCELADA",
    };
  }

  if (estadoNormalizado === "completada" || estadoNormalizado === "completado") {
    return {
      permitida: false,
      esGratuita: false,
      horasRestantes,
      fechaLimiteGratuita,
      porcentajePenalizacion: 0,
      montoPenalizacionCentavos: 0,
      montoReembolsoCentavos: 0,
      motivoRechazo: "CITA_COMPLETADA",
    };
  }

  if (horasRestantes <= 0) {
    return {
      permitida: false,
      esGratuita: false,
      horasRestantes,
      fechaLimiteGratuita,
      porcentajePenalizacion: 100,
      montoPenalizacionCentavos: precioSeguro,
      montoReembolsoCentavos: 0,
      motivoRechazo: "CITA_PASADA_O_EN_CURSO",
    };
  }

  if (
    politica.bloquearCancelacionTardia &&
    horasRestantes < politica.horasMinimasCancelacion
  ) {
    return {
      permitida: false,
      esGratuita: false,
      horasRestantes,
      fechaLimiteGratuita,
      porcentajePenalizacion: 100,
      montoPenalizacionCentavos: precioSeguro,
      montoReembolsoCentavos: 0,
      motivoRechazo: "DENTRO_VENTANA_BLOQUEO",
    };
  }

  const porcentajePenalizacion = resolverPorcentajePenalizacion(
    horasRestantes,
    politica
  );
  const montoPenalizacionCentavos = Math.round(
    (precioSeguro * porcentajePenalizacion) / 100
  );
  const montoReembolsoCentavos = Math.max(
    0,
    precioSeguro - montoPenalizacionCentavos
  );

  return {
    permitida: true,
    esGratuita: montoPenalizacionCentavos === 0,
    horasRestantes,
    fechaLimiteGratuita,
    porcentajePenalizacion,
    montoPenalizacionCentavos,
    montoReembolsoCentavos,
  };
}

/**
 * Determina si una cita existente cumple las reglas de estado, límite de cambios
 * y ventana temporal mínima para ser reprogramada.
 */
export function evaluarElegibilidadReprogramacion(
  cita: CitaEvaluacionPolitica,
  politica: PoliticaCancelacionConfig,
  ahora: Date,
  nuevoInicioPropuesto?: Date
): ResultadoElegibilidadReprogramacion {
  const horasRestantesActual =
    (cita.inicio.getTime() - ahora.getTime()) / MS_POR_HORA;
  const usadas = Math.max(0, cita.reprogramacionesRealizadas ?? 0);
  const reprogramacionesRestantes = Math.max(
    0,
    politica.maxReprogramacionesPermitidas - usadas
  );
  const fechaLimiteReprogramacion = new Date(
    cita.inicio.getTime() -
      Math.max(0, politica.horasMinimasReprogramacion) * MS_POR_HORA
  );

  const estadoNormalizado = cita.estado.trim().toLowerCase();
  if (
    estadoNormalizado === "cancelada" ||
    estadoNormalizado === "cancelado" ||
    estadoNormalizado === "completada" ||
    estadoNormalizado === "completado"
  ) {
    return {
      elegible: false,
      horasRestantesActual,
      reprogramacionesRestantes,
      fechaLimiteReprogramacion,
      motivoRechazo: "CITA_NO_ACTIVA",
    };
  }

  if (horasRestantesActual <= 0) {
    return {
      elegible: false,
      horasRestantesActual,
      reprogramacionesRestantes,
      fechaLimiteReprogramacion,
      motivoRechazo: "CITA_PASADA_O_EN_CURSO",
    };
  }

  if (usadas >= politica.maxReprogramacionesPermitidas) {
    return {
      elegible: false,
      horasRestantesActual,
      reprogramacionesRestantes: 0,
      fechaLimiteReprogramacion,
      motivoRechazo: "LIMITE_REPROGRAMACIONES_ALCANZADO",
    };
  }

  if (horasRestantesActual < politica.horasMinimasReprogramacion) {
    return {
      elegible: false,
      horasRestantesActual,
      reprogramacionesRestantes,
      fechaLimiteReprogramacion,
      motivoRechazo: "FUERA_DE_VENTANA_MINIMA",
    };
  }

  if (
    nuevoInicioPropuesto &&
    nuevoInicioPropuesto.getTime() === cita.inicio.getTime()
  ) {
    return {
      elegible: false,
      horasRestantesActual,
      reprogramacionesRestantes,
      fechaLimiteReprogramacion,
      motivoRechazo: "MISMO_HORARIO_ORIGINAL",
    };
  }

  return {
    elegible: true,
    horasRestantesActual,
    reprogramacionesRestantes,
    fechaLimiteReprogramacion,
  };
}

export interface ParametrosValidarReprogramacion {
  cita: CitaEvaluacionPolitica;
  politica?: PoliticaCancelacionConfig;
  ahora: Date;
  nuevoInicio: Date;
  nuevoFin: Date;
  citasExistentes?: CitaOcupada[];
  horarioLaboral?: HorarioAtencionDia | null;
}

export interface ResultadoValidacionReprogramacion {
  permitida: boolean;
  elegibilidad: ResultadoElegibilidadReprogramacion;
  autoColisionIgnorada: boolean;
  colisionConTerceros: boolean;
  motivoRechazo?:
    | MotivoRechazoReprogramacion
    | "HORARIO_OCUPADO"
    | "FUERA_DE_HORARIO_LABORAL";
  mensaje: string;
}

/**
 * Valida la reprogramación de una cita existente combinando políticas de antelación
 * con verificación de no-colisión de calendario, excluyendo expresamente el propio ID
 * de la cita para permitir desplazamientos o ajustes de horario contiguos sin auto-bloqueo.
 */
export function validarPoliticaReprogramacionConExclusion(
  params: ParametrosValidarReprogramacion,
): ResultadoValidacionReprogramacion {
  const {
    cita,
    politica = POLITICA_CANCELACION_POR_DEFECTO,
    ahora,
    nuevoInicio,
    nuevoFin,
    citasExistentes = [],
    horarioLaboral,
  } = params;

  const elegibilidad = evaluarElegibilidadReprogramacion(
    cita,
    politica,
    ahora,
    nuevoInicio,
  );

  if (!elegibilidad.elegible) {
    return {
      permitida: false,
      elegibilidad,
      autoColisionIgnorada: false,
      colisionConTerceros: false,
      motivoRechazo: elegibilidad.motivoRechazo,
      mensaje: "La cita no cumple los requisitos temporales o límites de reprogramación.",
    };
  }

  if (nuevoInicio.getTime() >= nuevoFin.getTime()) {
    return {
      permitida: false,
      elegibilidad,
      autoColisionIgnorada: false,
      colisionConTerceros: false,
      motivoRechazo: "MISMO_HORARIO_ORIGINAL",
      mensaje: "El horario de inicio propuesto debe ser anterior al horario de fin.",
    };
  }

  // Verificar horario laboral si está configurado
  if (horarioLaboral && horarioLaboral.activo !== false) {
    const horaIniStr = `${String(nuevoInicio.getUTCHours()).padStart(2, "0")}:${String(nuevoInicio.getUTCMinutes()).padStart(2, "0")}`;
    const horaFinStr = `${String(nuevoFin.getUTCHours()).padStart(2, "0")}:${String(nuevoFin.getUTCMinutes()).padStart(2, "0")}`;
    const iniMin = horaAMinutos(horaIniStr);
    const finMin = horaAMinutos(horaFinStr);
    const abreMin = horaAMinutos(horarioLaboral.abre);
    const cierraMin = horaAMinutos(horarioLaboral.cierra);

    if (iniMin < abreMin || finMin > cierraMin) {
      return {
        permitida: false,
        elegibilidad,
        autoColisionIgnorada: false,
        colisionConTerceros: false,
        motivoRechazo: "FUERA_DE_HORARIO_LABORAL",
        mensaje: "El horario propuesto está fuera del horario de atención del negocio.",
      };
    }
  }

  let autoColisionIgnorada = false;
  let colisionConTerceros = false;

  const nuevoInicioMs = nuevoInicio.getTime();
  const nuevoFinMs = nuevoFin.getTime();

  for (const ocupada of citasExistentes) {
    // Si la cita ocupada es la misma cita que se está reprogramando, se ignora explícitamente
    if (ocupada.id && ocupada.id === cita.id) {
      autoColisionIgnorada = true;
      continue;
    }

    const estado = (ocupada.estado ?? "confirmada").trim().toLowerCase();
    if (estado === "cancelada" || estado === "cancelado") {
      continue;
    }

    const ocupadaInicioMs =
      ocupada.inicio instanceof Date
        ? ocupada.inicio.getTime()
        : new Date(ocupada.inicio).getTime();
    const ocupadaFinMs =
      ocupada.fin instanceof Date
        ? ocupada.fin.getTime()
        : new Date(ocupada.fin).getTime();

    if (isNaN(ocupadaInicioMs) || isNaN(ocupadaFinMs)) {
      continue;
    }

    // Traslape de intervalos: (A_ini < B_fin) y (A_fin > B_ini)
    if (nuevoInicioMs < ocupadaFinMs && nuevoFinMs > ocupadaInicioMs) {
      colisionConTerceros = true;
      break;
    }
  }

  if (colisionConTerceros) {
    return {
      permitida: false,
      elegibilidad,
      autoColisionIgnorada,
      colisionConTerceros: true,
      motivoRechazo: "HORARIO_OCUPADO",
      mensaje: "El nuevo horario entra en conflicto con otra cita previamente confirmada.",
    };
  }

  return {
    permitida: true,
    elegibilidad,
    autoColisionIgnorada,
    colisionConTerceros: false,
    mensaje: "Horario de reprogramación disponible y elegible.",
  };
}

