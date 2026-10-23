/**
 * Motor Puro de Políticas de Cancelación, Penalizaciones Escalonadas
 * y Elegibilidad de Reprogramación.
 *
 * Evalúa invariantes temporales, cargos en centavos y límites de cambios de horario
 * sin acoplamiento a base de datos ni interfaz gráfica.
 */

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
