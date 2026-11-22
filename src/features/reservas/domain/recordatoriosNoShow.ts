/**
 * Motor Puro de Riesgo de Inasistencia (No-Show), Cadencia Adaptativa de
 * Recordatorios, Cumplimiento de Horas de Silencio y Despacho Idempotente.
 *
 * Evalúa señales objetivas del historial del cliente, anticipación de reserva,
 * cobertura de anticipo en centavos y confirmación explícita para construir
 * un plan determinístico de recordatorios y políticas de auto-liberación hacia
 * lista de espera sin dependencias de reloj global ni zona horaria del host.
 */

import { horaAMinutos } from "./motorDisponibilidad";

export type CanalRecordatorio = "EMAIL" | "WHATSAPP" | "SMS" | "PUSH";

export type NivelRiesgoNoShow = "BAJO" | "MODERADO" | "ALTO" | "CRITICO";

export type PropositoRecordatorio =
  | "RECORDATORIO_INFORMATIVO"
  | "SOLICITUD_CONFIRMACION"
  | "ULTIMO_AVISO";

export type EstadoRecordatorioPlanificado =
  | "PROGRAMADO"
  | "OMITIDO_EN_PASADO"
  | "OMITIDO_POR_VENTANA"
  | "OMITIDO_SIN_CANAL"
  | "OMITIDO_POR_COLISION_CADENCIA"
  | "OMITIDO_YA_CONFIRMADA";

export type AccionVencimientoConfirmacion =
  | "NINGUNA"
  | "ALERTAR_ADMINISTRADOR"
  | "LIBERAR_A_LISTA_ESPERA";

export type EstrategiaAjusteSilencio =
  | "ADELANTAR_ANTES_SILENCIO"
  | "POSPONER_DESPUES_SILENCIO";

export interface HistorialClienteNoShow {
  readonly totalCitasPrevias: number;
  readonly noShowsPrevios: number;
  readonly cancelacionesTardiasPrevias?: number;
  readonly citasCompletadasPrevias?: number;
  readonly ultimoNoShowHaceDias?: number;
}

export interface PreferenciasNotificacionCliente {
  readonly tieneEmail?: boolean;
  readonly tieneTelefono?: boolean;
  readonly tienePush?: boolean;
  readonly canalesBloqueados?: readonly CanalRecordatorio[];
}

export interface VentanaSilencioConfig {
  readonly activa: boolean;
  /** Inicio inclusivo de horas de silencio en formato "HH:MM" (ej. "21:00"). */
  readonly inicioHora: string;
  /** Fin exclusivo de horas de silencio en formato "HH:MM" (ej. "08:00"). */
  readonly finHora: string;
  /** Estrategia preferida cuando un envío ideal cae en horas de silencio. */
  readonly estrategiaAjuste?: EstrategiaAjusteSilencio;
}

export interface ReglaCadenciaRecordatorio {
  readonly codigo: string;
  readonly horasAntesCita: number;
  readonly canalPreferido: CanalRecordatorio;
  readonly canalesFallback?: readonly CanalRecordatorio[];
  readonly proposito: PropositoRecordatorio;
  readonly prioridad?: number;
  readonly omitirSiYaConfirmada?: boolean;
}

export interface PoliticaRecordatoriosConfig {
  readonly ventanaSilencio?: VentanaSilencioConfig;
  /** Minutos mínimos antes del inicio de la cita para permitir programar un recordatorio. */
  readonly margenMinimoAntesCitaMin?: number;
  /** Separación mínima en minutos entre dos recordatorios programados de la misma cita. */
  readonly separacionMinimaEntreEnviosMin?: number;
  /** Horas antes de la cita para exigir confirmación en riesgo ALTO. */
  readonly horasLimiteConfirmacionAltoRiesgo?: number;
  /** Horas antes de la cita para exigir confirmación en riesgo CRITICO. */
  readonly horasLimiteConfirmacionCritico?: number;
  /** Porcentaje mínimo de anticipo pagado (0..100) que exime la auto-liberación de la cita. */
  readonly porcentajeAnticipoEximeAutoLiberacion?: number;
  /** Reglas personalizadas por nivel de riesgo; sobrescriben el catálogo por defecto del nivel indicado. */
  readonly reglasPorNivel?: Partial<
    Record<NivelRiesgoNoShow, readonly ReglaCadenciaRecordatorio[]>
  >;
}

export interface FactorRiesgoNoShow {
  readonly codigo: string;
  readonly impactoPuntos: number;
  readonly descripcion: string;
}

export interface ResultadoEvaluacionRiesgoNoShow {
  readonly puntajeRiesgo: number;
  readonly nivelRiesgo: NivelRiesgoNoShow;
  readonly factores: readonly FactorRiesgoNoShow[];
  readonly requiereConfirmacionExplicita: boolean;
  readonly sugiereAnticipoPreventivo: boolean;
}

export interface SolicitudEvaluacionRiesgoNoShow {
  readonly inicioCita: Date;
  readonly fechaCreacionReserva: Date;
  readonly precioTotalCentavos: number;
  readonly anticipoPagadoCentavos?: number;
  readonly confirmadaPorCliente?: boolean;
  readonly historialCliente?: HistorialClienteNoShow;
}

export interface SolicitudPlanRecordatorios extends SolicitudEvaluacionRiesgoNoShow {
  readonly citaId: string;
  readonly ahora: Date;
  readonly preferenciasCliente?: PreferenciasNotificacionCliente;
  /** Desfase UTC de la zona horaria del negocio en minutos (ej. -360 para UTC-6, 0 para UTC). */
  readonly offsetMinutosZonaHoraria?: number;
  readonly politica?: PoliticaRecordatoriosConfig;
}

export interface RecordatorioPlanificado {
  readonly id: string;
  readonly codigoRegla: string;
  readonly proposito: PropositoRecordatorio;
  readonly estado: EstadoRecordatorioPlanificado;
  readonly canalSolicitado: CanalRecordatorio;
  readonly canalEfectivo: CanalRecordatorio | null;
  readonly fechaIdeal: Date;
  readonly programadoPara: Date | null;
  readonly ajustadoPorSilencio: boolean;
  readonly prioridad: number;
  readonly omitirSiYaConfirmada: boolean;
  readonly motivoOmision?: string;
}

export interface PlanRecordatoriosCita {
  readonly citaId: string;
  readonly evaluacionRiesgo: ResultadoEvaluacionRiesgoNoShow;
  readonly recordatorios: readonly RecordatorioPlanificado[];
  readonly recordatoriosProgramados: readonly RecordatorioPlanificado[];
  readonly recordatoriosOmitidos: readonly RecordatorioPlanificado[];
  readonly fechaLimiteConfirmacion: Date | null;
  readonly accionVencimientoConfirmacion: AccionVencimientoConfirmacion;
}

export interface ContextoDespachoRecordatorios {
  readonly ahora: Date;
  readonly estadoCita: string;
  readonly confirmadaPorCliente: boolean;
  readonly idsYaEnviados?: readonly string[];
}

export interface RecordatorioSuprimido {
  readonly id: string;
  readonly codigoRegla: string;
  readonly motivo: string;
}

export interface ResultadoDespachoRecordatorios {
  readonly listosParaEnviar: readonly RecordatorioPlanificado[];
  readonly suprimidos: readonly RecordatorioSuprimido[];
  readonly pendientesFuturos: readonly RecordatorioPlanificado[];
  readonly confirmacionVencida: boolean;
  readonly accionRecomendada: AccionVencimientoConfirmacion;
}

const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;
const MINUTOS_POR_DIA = 1_440;
const REGEX_HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const PUNTAJE_BASE_RIESGO = 15;
const UMBRAL_ALTO_VALOR_CENTAVOS = 50_000;
const VENTANA_GRACIA_CONFIRMACION_HORAS = 2;

export const VENTANA_SILENCIO_POR_DEFECTO: Readonly<VentanaSilencioConfig> = {
  activa: true,
  inicioHora: "21:00",
  finHora: "08:00",
  estrategiaAjuste: "ADELANTAR_ANTES_SILENCIO",
};

export const CADENCIA_RECORDATORIOS_POR_DEFECTO: Readonly<
  Record<NivelRiesgoNoShow, readonly ReglaCadenciaRecordatorio[]>
> = {
  BAJO: [
    {
      codigo: "RECORDATORIO_24H",
      horasAntesCita: 24,
      canalPreferido: "EMAIL",
      canalesFallback: ["WHATSAPP"],
      proposito: "RECORDATORIO_INFORMATIVO",
    },
  ],
  MODERADO: [
    {
      codigo: "RECORDATORIO_48H",
      horasAntesCita: 48,
      canalPreferido: "EMAIL",
      canalesFallback: ["WHATSAPP"],
      proposito: "RECORDATORIO_INFORMATIVO",
    },
    {
      codigo: "ULTIMO_AVISO_4H",
      horasAntesCita: 4,
      canalPreferido: "WHATSAPP",
      canalesFallback: ["SMS", "EMAIL"],
      proposito: "ULTIMO_AVISO",
    },
  ],
  ALTO: [
    {
      codigo: "RECORDATORIO_72H",
      horasAntesCita: 72,
      canalPreferido: "EMAIL",
      canalesFallback: ["WHATSAPP"],
      proposito: "RECORDATORIO_INFORMATIVO",
    },
    {
      codigo: "CONFIRMACION_24H",
      horasAntesCita: 24,
      canalPreferido: "WHATSAPP",
      canalesFallback: ["SMS", "EMAIL"],
      proposito: "SOLICITUD_CONFIRMACION",
      omitirSiYaConfirmada: true,
    },
    {
      codigo: "ULTIMO_AVISO_3H",
      horasAntesCita: 3,
      canalPreferido: "SMS",
      canalesFallback: ["WHATSAPP", "EMAIL"],
      proposito: "ULTIMO_AVISO",
    },
  ],
  CRITICO: [
    {
      codigo: "RECORDATORIO_72H",
      horasAntesCita: 72,
      canalPreferido: "EMAIL",
      canalesFallback: ["WHATSAPP"],
      proposito: "RECORDATORIO_INFORMATIVO",
    },
    {
      codigo: "CONFIRMACION_36H",
      horasAntesCita: 36,
      canalPreferido: "WHATSAPP",
      canalesFallback: ["SMS", "EMAIL"],
      proposito: "SOLICITUD_CONFIRMACION",
      omitirSiYaConfirmada: true,
    },
    {
      codigo: "CONFIRMACION_12H",
      horasAntesCita: 12,
      canalPreferido: "SMS",
      canalesFallback: ["WHATSAPP", "EMAIL"],
      proposito: "SOLICITUD_CONFIRMACION",
      omitirSiYaConfirmada: true,
    },
    {
      codigo: "ULTIMO_AVISO_2H",
      horasAntesCita: 2,
      canalPreferido: "WHATSAPP",
      canalesFallback: ["SMS", "EMAIL"],
      proposito: "ULTIMO_AVISO",
    },
  ],
};

export const POLITICA_RECORDATORIOS_POR_DEFECTO: Readonly<
  Required<Omit<PoliticaRecordatoriosConfig, "reglasPorNivel">>
> = {
  ventanaSilencio: VENTANA_SILENCIO_POR_DEFECTO,
  margenMinimoAntesCitaMin: 30,
  separacionMinimaEntreEnviosMin: 90,
  horasLimiteConfirmacionAltoRiesgo: 12,
  horasLimiteConfirmacionCritico: 24,
  porcentajeAnticipoEximeAutoLiberacion: 50,
};

function prioridadPorProposito(proposito: PropositoRecordatorio): number {
  switch (proposito) {
    case "SOLICITUD_CONFIRMACION":
      return 3;
    case "ULTIMO_AVISO":
      return 2;
    case "RECORDATORIO_INFORMATIVO":
      return 1;
  }
}

function obtenerMinutosDelDiaLocal(
  fecha: Date,
  offsetMinutosZonaHoraria: number
): number {
  const localDate = new Date(
    fecha.getTime() + offsetMinutosZonaHoraria * MS_POR_MINUTO
  );
  return localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
}

function esFechaValida(fecha: Date): boolean {
  return fecha instanceof Date && Number.isFinite(fecha.getTime());
}

/**
 * Valida la consistencia matemática y de dominio de una política de recordatorios.
 */
export function validarPoliticaRecordatorios(
  politica: PoliticaRecordatoriosConfig
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (politica.ventanaSilencio && politica.ventanaSilencio.activa) {
    const { inicioHora, finHora } = politica.ventanaSilencio;
    const inicioValido = REGEX_HORA_HHMM.test(inicioHora);
    const finValido = REGEX_HORA_HHMM.test(finHora);

    if (!inicioValido || !finValido) {
      errores.push(
        "Las horas de inicio y fin de la ventana de silencio deben tener formato HH:MM válido."
      );
    } else if (horaAMinutos(inicioHora) === horaAMinutos(finHora)) {
      errores.push(
        "La hora de inicio y la hora de fin de la ventana de silencio no pueden ser iguales."
      );
    }
  }

  if (
    politica.margenMinimoAntesCitaMin !== undefined &&
    (!Number.isFinite(politica.margenMinimoAntesCitaMin) ||
      politica.margenMinimoAntesCitaMin < 0)
  ) {
    errores.push(
      "El margen mínimo antes de la cita debe ser un número mayor o igual a 0."
    );
  }

  if (
    politica.separacionMinimaEntreEnviosMin !== undefined &&
    (!Number.isFinite(politica.separacionMinimaEntreEnviosMin) ||
      politica.separacionMinimaEntreEnviosMin < 0)
  ) {
    errores.push(
      "La separación mínima entre envíos debe ser un número mayor o igual a 0."
    );
  }

  if (
    politica.horasLimiteConfirmacionAltoRiesgo !== undefined &&
    (!Number.isFinite(politica.horasLimiteConfirmacionAltoRiesgo) ||
      politica.horasLimiteConfirmacionAltoRiesgo <= 0)
  ) {
    errores.push(
      "Las horas límite de confirmación para riesgo alto deben ser mayores a 0."
    );
  }

  if (
    politica.horasLimiteConfirmacionCritico !== undefined &&
    (!Number.isFinite(politica.horasLimiteConfirmacionCritico) ||
      politica.horasLimiteConfirmacionCritico <= 0)
  ) {
    errores.push(
      "Las horas límite de confirmación para riesgo crítico deben ser mayores a 0."
    );
  }

  if (
    politica.porcentajeAnticipoEximeAutoLiberacion !== undefined &&
    (!Number.isFinite(politica.porcentajeAnticipoEximeAutoLiberacion) ||
      politica.porcentajeAnticipoEximeAutoLiberacion < 0 ||
      politica.porcentajeAnticipoEximeAutoLiberacion > 100)
  ) {
    errores.push(
      "El porcentaje de anticipo que exime auto-liberación debe estar entre 0 y 100."
    );
  }

  if (politica.reglasPorNivel) {
    const niveles = Object.keys(politica.reglasPorNivel) as NivelRiesgoNoShow[];
    for (const nivel of niveles) {
      const reglas = politica.reglasPorNivel[nivel];
      if (!reglas) continue;

      const codigosVistos = new Set<string>();
      for (const regla of reglas) {
        if (!regla.codigo || !regla.codigo.trim()) {
          errores.push(
            `Todas las reglas del nivel ${nivel} deben tener un código no vacío.`
          );
        } else if (codigosVistos.has(regla.codigo.trim())) {
          errores.push(
            `Existe un código de regla duplicado ("${regla.codigo}") en el nivel ${nivel}.`
          );
        } else {
          codigosVistos.add(regla.codigo.trim());
        }

        if (!Number.isFinite(regla.horasAntesCita) || regla.horasAntesCita <= 0) {
          errores.push(
            `La regla "${regla.codigo}" del nivel ${nivel} debe indicar horasAntesCita mayor a 0.`
          );
        }
      }
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Determina si un instante dado cae dentro de la ventana de horas de silencio
 * en el horario local definido por `offsetMinutosZonaHoraria`.
 * El intervalo [inicioHora, finHora) es semiabierto y soporta cruce de medianoche.
 */
export function estaEnHorasDeSilencio(
  fecha: Date,
  ventana: VentanaSilencioConfig | undefined,
  offsetMinutosZonaHoraria = 0
): boolean {
  if (!ventana || !ventana.activa) {
    return false;
  }

  if (
    !REGEX_HORA_HHMM.test(ventana.inicioHora) ||
    !REGEX_HORA_HHMM.test(ventana.finHora)
  ) {
    return false;
  }

  const inicioMin = horaAMinutos(ventana.inicioHora);
  const finMin = horaAMinutos(ventana.finHora);

  if (inicioMin === finMin) {
    return false;
  }

  const minutosLocal = obtenerMinutosDelDiaLocal(fecha, offsetMinutosZonaHoraria);

  if (inicioMin < finMin) {
    return minutosLocal >= inicioMin && minutosLocal < finMin;
  }

  // Cruce de medianoche (ej. 21:00 a 08:00)
  return minutosLocal >= inicioMin || minutosLocal < finMin;
}

/**
 * Calcula los dos límites externos adyacentes a una ventana de silencio para
 * un instante que cae dentro de ella: el último minuto permitido previo
 * (`antesSilencio`) y el primer minuto permitido posterior (`despuesSilencio`).
 */
export function calcularLimitesFueraDeSilencio(
  fecha: Date,
  ventana: VentanaSilencioConfig,
  offsetMinutosZonaHoraria = 0
): { antesSilencio: Date; despuesSilencio: Date } {
  const inicioMin = horaAMinutos(ventana.inicioHora);
  const finMin = horaAMinutos(ventana.finHora);
  const offsetMs = offsetMinutosZonaHoraria * MS_POR_MINUTO;
  const localMs = fecha.getTime() + offsetMs;
  const localFloorMinMs = Math.floor(localMs / MS_POR_MINUTO) * MS_POR_MINUTO;
  const localDate = new Date(localFloorMinMs);
  const minutosLocal = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();

  let minutosAtras: number;
  let minutosAdelante: number;

  if (inicioMin < finMin) {
    // Ventana intra-día [inicioMin, finMin)
    minutosAtras = minutosLocal - inicioMin + 1;
    minutosAdelante = finMin - minutosLocal;
  } else if (minutosLocal >= inicioMin) {
    // Parte nocturna antes de medianoche en ventana cruzada
    minutosAtras = minutosLocal - inicioMin + 1;
    minutosAdelante = MINUTOS_POR_DIA - minutosLocal + finMin;
  } else {
    // Parte de madrugada después de medianoche en ventana cruzada
    minutosAtras = MINUTOS_POR_DIA - inicioMin + minutosLocal + 1;
    minutosAdelante = finMin - minutosLocal;
  }

  const antesSilencio = new Date(
    localFloorMinMs - minutosAtras * MS_POR_MINUTO - offsetMs
  );
  const despuesSilencio = new Date(
    localFloorMinMs + minutosAdelante * MS_POR_MINUTO - offsetMs
  );

  return { antesSilencio, despuesSilencio };
}

export class MotorRecordatoriosNoShow {
  /**
   * Calcula un puntaje determinístico de riesgo de inasistencia (0..100) con
   * factores auditables y recomendaciones operativas de confirmación/anticipo.
   */
  public static evaluarRiesgoNoShow(
    solicitud: SolicitudEvaluacionRiesgoNoShow
  ): ResultadoEvaluacionRiesgoNoShow {
    if (!esFechaValida(solicitud.inicioCita)) {
      throw new Error("La fecha de inicio de la cita debe ser válida.");
    }
    if (!esFechaValida(solicitud.fechaCreacionReserva)) {
      throw new Error("La fecha de creación de la reserva debe ser válida.");
    }
    if (
      !Number.isInteger(solicitud.precioTotalCentavos) ||
      solicitud.precioTotalCentavos < 0
    ) {
      throw new Error(
        "El precio total de la cita debe ser un entero mayor o igual a 0 en centavos."
      );
    }

    const anticipo = solicitud.anticipoPagadoCentavos ?? 0;
    if (
      !Number.isInteger(anticipo) ||
      anticipo < 0 ||
      anticipo > solicitud.precioTotalCentavos
    ) {
      throw new Error(
        "El anticipo pagado debe ser un entero en centavos entre 0 y el precio total."
      );
    }

    const factores: FactorRiesgoNoShow[] = [];
    let acumulado = PUNTAJE_BASE_RIESGO;

    // 1. Señales del historial de asistencia
    const historial = solicitud.historialCliente;
    if (historial) {
      if (
        !Number.isInteger(historial.totalCitasPrevias) ||
        historial.totalCitasPrevias < 0
      ) {
        throw new Error(
          "El total de citas previas debe ser un entero mayor o igual a 0."
        );
      }
      if (
        !Number.isInteger(historial.noShowsPrevios) ||
        historial.noShowsPrevios < 0 ||
        historial.noShowsPrevios > historial.totalCitasPrevias
      ) {
        throw new Error(
          "Los no-shows previos deben ser un entero entre 0 y el total de citas previas."
        );
      }
      if (
        historial.cancelacionesTardiasPrevias !== undefined &&
        (!Number.isInteger(historial.cancelacionesTardiasPrevias) ||
          historial.cancelacionesTardiasPrevias < 0)
      ) {
        throw new Error(
          "Las cancelaciones tardías previas deben ser un entero mayor o igual a 0."
        );
      }
      if (
        historial.citasCompletadasPrevias !== undefined &&
        (!Number.isInteger(historial.citasCompletadasPrevias) ||
          historial.citasCompletadasPrevias < 0)
      ) {
        throw new Error(
          "Las citas completadas previas deben ser un entero mayor o igual a 0."
        );
      }
      if (
        historial.ultimoNoShowHaceDias !== undefined &&
        (!Number.isFinite(historial.ultimoNoShowHaceDias) ||
          historial.ultimoNoShowHaceDias < 0)
      ) {
        throw new Error(
          "Los días desde el último no-show deben ser mayores o iguales a 0."
        );
      }
    }

    if (!historial || historial.totalCitasPrevias === 0) {
      acumulado += 10;
      factores.push({
        codigo: "CLIENTE_NUEVO_SIN_HISTORIAL",
        impactoPuntos: 10,
        descripcion: "Cliente nuevo sin historial previo de asistencia.",
      });
    } else {
      if (historial.noShowsPrevios > 0) {
        const tasaNoShow = historial.noShowsPrevios / historial.totalCitasPrevias;
        const impactoNoShow = Math.min(
          45,
          historial.noShowsPrevios * 15 + Math.round(tasaNoShow * 20)
        );
        acumulado += impactoNoShow;
        factores.push({
          codigo: "HISTORIAL_NO_SHOWS",
          impactoPuntos: impactoNoShow,
          descripcion: `Registra ${historial.noShowsPrevios} inasistencia(s) en ${historial.totalCitasPrevias} cita(s) previas.`,
        });

        if (
          historial.ultimoNoShowHaceDias !== undefined &&
          historial.ultimoNoShowHaceDias <= 30
        ) {
          acumulado += 12;
          factores.push({
            codigo: "NO_SHOW_RECIENTE",
            impactoPuntos: 12,
            descripcion: `Última inasistencia registrada hace ${historial.ultimoNoShowHaceDias} día(s).`,
          });
        }
      }

      const cancelacionesTardias = historial.cancelacionesTardiasPrevias ?? 0;
      if (cancelacionesTardias > 0) {
        const impactoCancelaciones = Math.min(20, cancelacionesTardias * 8);
        acumulado += impactoCancelaciones;
        factores.push({
          codigo: "CANCELACIONES_TARDIAS_PREVIAS",
          impactoPuntos: impactoCancelaciones,
          descripcion: `Acumula ${cancelacionesTardias} cancelación(es) tardía(s) previa(s).`,
        });
      }

      const completadas = historial.citasCompletadasPrevias ?? 0;
      if (historial.noShowsPrevios === 0 && completadas >= 3) {
        const bonificacion = -Math.min(18, completadas * 3);
        acumulado += bonificacion;
        factores.push({
          codigo: "HISTORIAL_CONFIABLE",
          impactoPuntos: bonificacion,
          descripcion: `Historial confiable con ${completadas} cita(s) completada(s) sin inasistencias.`,
        });
      }
    }

    // 2. Horizonte de anticipación desde la creación de la reserva
    const horasAnticipacion =
      (solicitud.inicioCita.getTime() - solicitud.fechaCreacionReserva.getTime()) /
      MS_POR_HORA;

    if (horasAnticipacion >= 336) {
      acumulado += 18;
      factores.push({
        codigo: "ANTICIPACION_MUY_LARGA",
        impactoPuntos: 18,
        descripcion: "Reserva agendada con 14 días o más de anticipación.",
      });
    } else if (horasAnticipacion >= 168) {
      acumulado += 10;
      factores.push({
        codigo: "ANTICIPACION_LARGA",
        impactoPuntos: 10,
        descripcion: "Reserva agendada con 7 a 13 días de anticipación.",
      });
    } else if (horasAnticipacion > 0 && horasAnticipacion <= 6) {
      acumulado -= 8;
      factores.push({
        codigo: "RESERVA_INMEDIATA",
        impactoPuntos: -8,
        descripcion: "Reserva creada el mismo día con alta intención de asistencia.",
      });
    }

    // 3. Cobertura financiera mediante anticipo
    const porcentajeAnticipo =
      solicitud.precioTotalCentavos > 0
        ? Math.min(
            100,
            Math.round((anticipo / solicitud.precioTotalCentavos) * 100)
          )
        : 0;

    if (porcentajeAnticipo >= 100) {
      acumulado -= 25;
      factores.push({
        codigo: "PAGO_COMPLETO_ANTICIPADO",
        impactoPuntos: -25,
        descripcion: "La reserva cuenta con el 100% del monto cubierto por adelantado.",
      });
    } else if (porcentajeAnticipo >= 30) {
      acumulado -= 15;
      factores.push({
        codigo: "ANTICIPO_CUBIERTO",
        impactoPuntos: -15,
        descripcion: `La reserva cuenta con un anticipo del ${porcentajeAnticipo}%.`,
      });
    } else if (
      solicitud.precioTotalCentavos >= UMBRAL_ALTO_VALOR_CENTAVOS &&
      porcentajeAnticipo === 0
    ) {
      acumulado += 8;
      factores.push({
        codigo: "SERVICIO_ALTO_VALOR_SIN_ANTICIPO",
        impactoPuntos: 8,
        descripcion: "Servicio de ticket elevado sin anticipo de garantía.",
      });
    }

    // 4. Confirmación explícita del cliente
    const confirmada = Boolean(solicitud.confirmadaPorCliente);
    if (confirmada) {
      acumulado -= 15;
      factores.push({
        codigo: "CONFIRMACION_EXPLICITA_RECIBIDA",
        impactoPuntos: -15,
        descripcion: "El cliente ya confirmó explícitamente su asistencia.",
      });
    }

    const puntajeRiesgo = Math.min(100, Math.max(0, Math.round(acumulado)));
    const nivelRiesgo = this.clasificarNivelRiesgo(puntajeRiesgo);
    const esRiesgoElevado =
      nivelRiesgo === "ALTO" || nivelRiesgo === "CRITICO";

    return {
      puntajeRiesgo,
      nivelRiesgo,
      factores,
      requiereConfirmacionExplicita: esRiesgoElevado && !confirmada,
      sugiereAnticipoPreventivo: esRiesgoElevado && porcentajeAnticipo < 30,
    };
  }

  /**
   * Construye el plan completo de recordatorios para una cita ajustando por horas
   * de silencio, fallback/opt-out de canales, separación mínima anti-spam y
   * fecha límite de confirmación con política de auto-liberación.
   */
  public static planificar(
    solicitud: SolicitudPlanRecordatorios
  ): PlanRecordatoriosCita {
    if (!solicitud.citaId || !solicitud.citaId.trim()) {
      throw new Error("El citaId es obligatorio para planificar recordatorios.");
    }
    if (!esFechaValida(solicitud.ahora)) {
      throw new Error("La fecha de referencia 'ahora' debe ser válida.");
    }

    const offsetMin = solicitud.offsetMinutosZonaHoraria ?? 0;
    if (!Number.isInteger(offsetMin) || offsetMin < -720 || offsetMin > 840) {
      throw new Error(
        "El offsetMinutosZonaHoraria debe ser un entero entre -720 y 840."
      );
    }

    if (solicitud.politica) {
      const validacionPolitica = validarPoliticaRecordatorios(solicitud.politica);
      if (!validacionPolitica.valido) {
        throw new Error(validacionPolitica.errores.join(" "));
      }
    }

    const evaluacionRiesgo = this.evaluarRiesgoNoShow(solicitud);
    const politicaEfectiva = {
      ventanaSilencio:
        solicitud.politica?.ventanaSilencio ??
        POLITICA_RECORDATORIOS_POR_DEFECTO.ventanaSilencio,
      margenMinimoAntesCitaMin:
        solicitud.politica?.margenMinimoAntesCitaMin ??
        POLITICA_RECORDATORIOS_POR_DEFECTO.margenMinimoAntesCitaMin,
      separacionMinimaEntreEnviosMin:
        solicitud.politica?.separacionMinimaEntreEnviosMin ??
        POLITICA_RECORDATORIOS_POR_DEFECTO.separacionMinimaEntreEnviosMin,
      horasLimiteConfirmacionAltoRiesgo:
        solicitud.politica?.horasLimiteConfirmacionAltoRiesgo ??
        POLITICA_RECORDATORIOS_POR_DEFECTO.horasLimiteConfirmacionAltoRiesgo,
      horasLimiteConfirmacionCritico:
        solicitud.politica?.horasLimiteConfirmacionCritico ??
        POLITICA_RECORDATORIOS_POR_DEFECTO.horasLimiteConfirmacionCritico,
      porcentajeAnticipoEximeAutoLiberacion:
        solicitud.politica?.porcentajeAnticipoEximeAutoLiberacion ??
        POLITICA_RECORDATORIOS_POR_DEFECTO.porcentajeAnticipoEximeAutoLiberacion,
    };

    const reglasNivel =
      solicitud.politica?.reglasPorNivel?.[evaluacionRiesgo.nivelRiesgo] ??
      CADENCIA_RECORDATORIOS_POR_DEFECTO[evaluacionRiesgo.nivelRiesgo];

    const ahoraMs = solicitud.ahora.getTime();
    const inicioCitaMs = solicitud.inicioCita.getTime();
    const limiteUltimoEnvioMs =
      inicioCitaMs - politicaEfectiva.margenMinimoAntesCitaMin * MS_POR_MINUTO;

    const citaIdLimpio = solicitud.citaId.trim();
    const preliminares: RecordatorioPlanificado[] = [];

    for (const regla of reglasNivel) {
      const id = `${citaIdLimpio}:${regla.codigo}`;
      const prioridad = regla.prioridad ?? prioridadPorProposito(regla.proposito);
      const omitirSiYaConfirmada =
        regla.omitirSiYaConfirmada ??
        regla.proposito === "SOLICITUD_CONFIRMACION";
      const fechaIdeal = new Date(
        inicioCitaMs - regla.horasAntesCita * MS_POR_HORA
      );

      if (omitirSiYaConfirmada && solicitud.confirmadaPorCliente) {
        preliminares.push({
          id,
          codigoRegla: regla.codigo,
          proposito: regla.proposito,
          estado: "OMITIDO_YA_CONFIRMADA",
          canalSolicitado: regla.canalPreferido,
          canalEfectivo: null,
          fechaIdeal,
          programadoPara: null,
          ajustadoPorSilencio: false,
          prioridad,
          omitirSiYaConfirmada,
          motivoOmision:
            "La cita ya se encuentra confirmada explícitamente por el cliente.",
        });
        continue;
      }

      const canalEfectivo = this.resolverCanalDisponible(
        regla,
        solicitud.preferenciasCliente
      );
      if (!canalEfectivo) {
        preliminares.push({
          id,
          codigoRegla: regla.codigo,
          proposito: regla.proposito,
          estado: "OMITIDO_SIN_CANAL",
          canalSolicitado: regla.canalPreferido,
          canalEfectivo: null,
          fechaIdeal,
          programadoPara: null,
          ajustadoPorSilencio: false,
          prioridad,
          omitirSiYaConfirmada,
          motivoOmision:
            "El cliente no cuenta con canales habilitados ni alternativas disponibles.",
        });
        continue;
      }

      if (inicioCitaMs <= ahoraMs) {
        preliminares.push({
          id,
          codigoRegla: regla.codigo,
          proposito: regla.proposito,
          estado: "OMITIDO_EN_PASADO",
          canalSolicitado: regla.canalPreferido,
          canalEfectivo,
          fechaIdeal,
          programadoPara: null,
          ajustadoPorSilencio: false,
          prioridad,
          omitirSiYaConfirmada,
          motivoOmision: "La cita ya inició o corresponde a una fecha pasada.",
        });
        continue;
      }

      if (fechaIdeal.getTime() > limiteUltimoEnvioMs) {
        preliminares.push({
          id,
          codigoRegla: regla.codigo,
          proposito: regla.proposito,
          estado: "OMITIDO_POR_VENTANA",
          canalSolicitado: regla.canalPreferido,
          canalEfectivo,
          fechaIdeal,
          programadoPara: null,
          ajustadoPorSilencio: false,
          prioridad,
          omitirSiYaConfirmada,
          motivoOmision:
            "El envío ideal viola el margen mínimo previo al inicio de la cita.",
        });
        continue;
      }

      const enSilencio = estaEnHorasDeSilencio(
        fechaIdeal,
        politicaEfectiva.ventanaSilencio,
        offsetMin
      );

      if (!enSilencio) {
        if (fechaIdeal.getTime() < ahoraMs) {
          preliminares.push({
            id,
            codigoRegla: regla.codigo,
            proposito: regla.proposito,
            estado: "OMITIDO_EN_PASADO",
            canalSolicitado: regla.canalPreferido,
            canalEfectivo,
            fechaIdeal,
            programadoPara: null,
            ajustadoPorSilencio: false,
            prioridad,
            omitirSiYaConfirmada,
            motivoOmision: "La fecha ideal de envío ya transcurrió.",
          });
          continue;
        }

        preliminares.push({
          id,
          codigoRegla: regla.codigo,
          proposito: regla.proposito,
          estado: "PROGRAMADO",
          canalSolicitado: regla.canalPreferido,
          canalEfectivo,
          fechaIdeal,
          programadoPara: fechaIdeal,
          ajustadoPorSilencio: false,
          prioridad,
          omitirSiYaConfirmada,
        });
        continue;
      }

      // Ajuste determinístico fuera de horas de silencio
      const { antesSilencio, despuesSilencio } = calcularLimitesFueraDeSilencio(
        fechaIdeal,
        politicaEfectiva.ventanaSilencio,
        offsetMin
      );

      const estrategia =
        politicaEfectiva.ventanaSilencio.estrategiaAjuste ??
        "ADELANTAR_ANTES_SILENCIO";
      const candidatosOrdenados =
        estrategia === "POSPONER_DESPUES_SILENCIO"
          ? [despuesSilencio, antesSilencio]
          : [antesSilencio, despuesSilencio];

      const candidatoValido = candidatosOrdenados.find(
        (c) =>
          c.getTime() >= ahoraMs &&
          c.getTime() <= limiteUltimoEnvioMs &&
          !estaEnHorasDeSilencio(c, politicaEfectiva.ventanaSilencio, offsetMin)
      );

      if (!candidatoValido) {
        const ambosEnPasado = candidatosOrdenados.every(
          (c) => c.getTime() < ahoraMs
        );
        preliminares.push({
          id,
          codigoRegla: regla.codigo,
          proposito: regla.proposito,
          estado: ambosEnPasado ? "OMITIDO_EN_PASADO" : "OMITIDO_POR_VENTANA",
          canalSolicitado: regla.canalPreferido,
          canalEfectivo,
          fechaIdeal,
          programadoPara: null,
          ajustadoPorSilencio: true,
          prioridad,
          omitirSiYaConfirmada,
          motivoOmision: ambosEnPasado
            ? "Tanto el horario ideal como los ajustes fuera de silencio están en el pasado."
            : "No existe una ventana válida fuera de horas de silencio antes del margen de la cita.",
        });
        continue;
      }

      preliminares.push({
        id,
        codigoRegla: regla.codigo,
        proposito: regla.proposito,
        estado: "PROGRAMADO",
        canalSolicitado: regla.canalPreferido,
        canalEfectivo,
        fechaIdeal,
        programadoPara: candidatoValido,
        ajustadoPorSilencio: true,
        prioridad,
        omitirSiYaConfirmada,
      });
    }

    // Deduplicación anti-spam priorizando reglas de mayor prioridad
    const resolucion = this.resolverColisionesCadencia(
      preliminares,
      politicaEfectiva.separacionMinimaEntreEnviosMin
    );

    const recordatoriosProgramados = resolucion
      .filter((r) => r.estado === "PROGRAMADO")
      .sort((a, b) => {
        const diff =
          (a.programadoPara?.getTime() ?? 0) -
          (b.programadoPara?.getTime() ?? 0);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      });

    const recordatoriosOmitidos = resolucion.filter(
      (r) => r.estado !== "PROGRAMADO"
    );

    const { fechaLimiteConfirmacion, accionVencimientoConfirmacion } =
      this.calcularPoliticaConfirmacion(
        solicitud,
        evaluacionRiesgo,
        politicaEfectiva,
        limiteUltimoEnvioMs
      );

    return {
      citaId: citaIdLimpio,
      evaluacionRiesgo,
      recordatorios: [...recordatoriosProgramados, ...recordatoriosOmitidos],
      recordatoriosProgramados,
      recordatoriosOmitidos,
      fechaLimiteConfirmacion,
      accionVencimientoConfirmacion,
    };
  }

  /**
   * Evalúa de forma idempotente qué recordatorios del plan deben despacharse en
   * el instante `contexto.ahora`, suprimiendo envíos duplicados o innecesarios
   * ante confirmación temprana, cancelación o finalización de la cita.
   */
  public static evaluarDespacho(
    plan: PlanRecordatoriosCita,
    contexto: ContextoDespachoRecordatorios
  ): ResultadoDespachoRecordatorios {
    if (!esFechaValida(contexto.ahora)) {
      throw new Error("La fecha de evaluación de despacho debe ser válida.");
    }

    const enviadosSet = new Set(contexto.idsYaEnviados ?? []);
    const estadoNormalizado = contexto.estadoCita.trim().toLowerCase();

    if (
      estadoNormalizado === "cancelada" ||
      estadoNormalizado === "cancelado" ||
      estadoNormalizado === "completada" ||
      estadoNormalizado === "completado"
    ) {
      const motivo =
        estadoNormalizado.startsWith("cancelad")
          ? "CITA_CANCELADA"
          : "CITA_COMPLETADA";
      const suprimidos: RecordatorioSuprimido[] = plan.recordatoriosProgramados
        .filter((r) => !enviadosSet.has(r.id))
        .map((r) => ({
          id: r.id,
          codigoRegla: r.codigoRegla,
          motivo,
        }));

      return {
        listosParaEnviar: [],
        suprimidos,
        pendientesFuturos: [],
        confirmacionVencida: false,
        accionRecomendada: "NINGUNA",
      };
    }

    const ahoraMs = contexto.ahora.getTime();
    const listosParaEnviar: RecordatorioPlanificado[] = [];
    const suprimidos: RecordatorioSuprimido[] = [];
    const pendientesFuturos: RecordatorioPlanificado[] = [];

    for (const rec of plan.recordatoriosProgramados) {
      if (enviadosSet.has(rec.id)) {
        continue;
      }

      if (rec.omitirSiYaConfirmada && contexto.confirmadaPorCliente) {
        suprimidos.push({
          id: rec.id,
          codigoRegla: rec.codigoRegla,
          motivo: "CITA_YA_CONFIRMADA_POR_CLIENTE",
        });
        continue;
      }

      if (rec.programadoPara && rec.programadoPara.getTime() <= ahoraMs) {
        listosParaEnviar.push(rec);
      } else {
        pendientesFuturos.push(rec);
      }
    }

    const confirmacionVencida = Boolean(
      !contexto.confirmadaPorCliente &&
        plan.fechaLimiteConfirmacion &&
        ahoraMs >= plan.fechaLimiteConfirmacion.getTime()
    );

    const accionRecomendada: AccionVencimientoConfirmacion = confirmacionVencida
      ? plan.accionVencimientoConfirmacion
      : "NINGUNA";

    return {
      listosParaEnviar,
      suprimidos,
      pendientesFuturos,
      confirmacionVencida,
      accionRecomendada,
    };
  }

  private static clasificarNivelRiesgo(puntaje: number): NivelRiesgoNoShow {
    if (puntaje >= 75) return "CRITICO";
    if (puntaje >= 50) return "ALTO";
    if (puntaje >= 25) return "MODERADO";
    return "BAJO";
  }

  private static resolverCanalDisponible(
    regla: ReglaCadenciaRecordatorio,
    preferencias: PreferenciasNotificacionCliente | undefined
  ): CanalRecordatorio | null {
    const bloqueados = new Set(preferencias?.canalesBloqueados ?? []);
    const tieneEmail = preferencias?.tieneEmail ?? true;
    const tieneTelefono = preferencias?.tieneTelefono ?? true;
    const tienePush = preferencias?.tienePush ?? false;

    const candidatos: CanalRecordatorio[] = [
      regla.canalPreferido,
      ...(regla.canalesFallback ?? []),
    ];

    for (const canal of candidatos) {
      if (bloqueados.has(canal)) {
        continue;
      }
      if (canal === "EMAIL" && tieneEmail) {
        return canal;
      }
      if ((canal === "WHATSAPP" || canal === "SMS") && tieneTelefono) {
        return canal;
      }
      if (canal === "PUSH" && tienePush) {
        return canal;
      }
    }

    return null;
  }

  private static resolverColisionesCadencia(
    preliminares: readonly RecordatorioPlanificado[],
    separacionMinimaMin: number
  ): RecordatorioPlanificado[] {
    if (separacionMinimaMin <= 0) {
      return [...preliminares];
    }

    const separacionMs = separacionMinimaMin * MS_POR_MINUTO;
    const programados = preliminares.filter((r) => r.estado === "PROGRAMADO");
    const yaOmitidos = preliminares.filter((r) => r.estado !== "PROGRAMADO");

    // Evaluar por prioridad descendente, luego fecha ascendente y finalmente código
    const ordenadosPorPrioridad = [...programados].sort((a, b) => {
      if (b.prioridad !== a.prioridad) {
        return b.prioridad - a.prioridad;
      }
      const diffTiempo =
        (a.programadoPara?.getTime() ?? 0) -
        (b.programadoPara?.getTime() ?? 0);
      if (diffTiempo !== 0) {
        return diffTiempo;
      }
      return a.codigoRegla.localeCompare(b.codigoRegla);
    });

    const aceptados: RecordatorioPlanificado[] = [];
    const colisionados: RecordatorioPlanificado[] = [];

    for (const candidato of ordenadosPorPrioridad) {
      const candidatoMs = candidato.programadoPara?.getTime() ?? 0;
      const conflicto = aceptados.find(
        (existente) =>
          Math.abs((existente.programadoPara?.getTime() ?? 0) - candidatoMs) <
          separacionMs
      );

      if (conflicto) {
        colisionados.push({
          ...candidato,
          estado: "OMITIDO_POR_COLISION_CADENCIA",
          programadoPara: null,
          motivoOmision: `Suprimido por separación mínima (${separacionMinimaMin} min) respecto a "${conflicto.codigoRegla}".`,
        });
      } else {
        aceptados.push(candidato);
      }
    }

    return [...aceptados, ...yaOmitidos, ...colisionados];
  }

  private static calcularPoliticaConfirmacion(
    solicitud: SolicitudPlanRecordatorios,
    evaluacion: ResultadoEvaluacionRiesgoNoShow,
    politica: {
      horasLimiteConfirmacionAltoRiesgo: number;
      horasLimiteConfirmacionCritico: number;
      porcentajeAnticipoEximeAutoLiberacion: number;
    },
    limiteUltimoEnvioMs: number
  ): {
    fechaLimiteConfirmacion: Date | null;
    accionVencimientoConfirmacion: AccionVencimientoConfirmacion;
  } {
    const ahoraMs = solicitud.ahora.getTime();
    const inicioCitaMs = solicitud.inicioCita.getTime();

    if (!evaluacion.requiereConfirmacionExplicita || inicioCitaMs <= ahoraMs) {
      return {
        fechaLimiteConfirmacion: null,
        accionVencimientoConfirmacion: "NINGUNA",
      };
    }

    const anticipo = solicitud.anticipoPagadoCentavos ?? 0;
    const porcentajeAnticipo =
      solicitud.precioTotalCentavos > 0
        ? Math.min(
            100,
            Math.round((anticipo / solicitud.precioTotalCentavos) * 100)
          )
        : 0;

    const exentoDeAutoLiberacion =
      porcentajeAnticipo >= politica.porcentajeAnticipoEximeAutoLiberacion;

    const accionVencimientoConfirmacion: AccionVencimientoConfirmacion =
      evaluacion.nivelRiesgo === "CRITICO" && !exentoDeAutoLiberacion
        ? "LIBERAR_A_LISTA_ESPERA"
        : "ALERTAR_ADMINISTRADOR";

    if (limiteUltimoEnvioMs <= ahoraMs) {
      return {
        fechaLimiteConfirmacion: null,
        accionVencimientoConfirmacion,
      };
    }

    const horasLimite =
      evaluacion.nivelRiesgo === "CRITICO"
        ? politica.horasLimiteConfirmacionCritico
        : politica.horasLimiteConfirmacionAltoRiesgo;

    const limiteNominalMs = inicioCitaMs - horasLimite * MS_POR_HORA;
    const limiteFinalMs =
      limiteNominalMs <= ahoraMs
        ? Math.min(
            limiteUltimoEnvioMs,
            ahoraMs + VENTANA_GRACIA_CONFIRMACION_HORAS * MS_POR_HORA
          )
        : Math.min(limiteUltimoEnvioMs, limiteNominalMs);

    return {
      fechaLimiteConfirmacion: new Date(limiteFinalMs),
      accionVencimientoConfirmacion,
    };
  }
}
