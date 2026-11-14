/**
 * Motor Puro de Cotización Multi-Servicio, Tarifas Dinámicas,
 * Cupones Promocionales y Cálculo de Anticipos.
 *
 * Opera íntegramente en centavos enteros para preservar precisión monetaria
 * y reutiliza las primitivas horarias de `motorDisponibilidad.ts`.
 */

import { horaAMinutos } from "./motorDisponibilidad";

export type TipoReglaTarifa =
  | "DESCUENTO_VALLE"
  | "RECARGO_PICO"
  | "DESCUENTO_PAQUETE"
  | "RECARGO_URGENCIA";

export interface ItemServicioCotizable {
  readonly servicioId: string;
  readonly nombre: string;
  readonly duracionMin: number;
  readonly precioCentavos: number;
}

export interface ReglaTarifaDinamica {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoReglaTarifa;
  readonly activa: boolean;
  /** Porcentaje entero o decimal de ajuste (positivo para recargo, negativo para descuento o según `tipo`). */
  readonly porcentajeAjuste: number;
  /** Días de la semana aplicables (0=Dom..6=Sáb). Vacío u omitido aplica todos los días. */
  readonly diasSemana?: readonly number[];
  /** Franja horaria inclusiva de inicio ("HH:MM"). */
  readonly horaInicio?: string;
  /** Franja horaria exclusiva/límite de fin ("HH:MM"). */
  readonly horaFin?: string;
  /** Cantidad mínima de servicios para `DESCUENTO_PAQUETE`. */
  readonly minServiciosPaquete?: number;
  /** Ocupación mínima (0..100) del día para activar `RECARGO_PICO`. */
  readonly ocupacionMinimaPorc?: number;
  /** Anticipación máxima en horas para `RECARGO_URGENCIA`. */
  readonly anticipacionMaxHoras?: number;
  /** Si es false y hay múltiples reglas aplicables, se prioriza el mayor beneficio neto/único. */
  readonly apilable?: boolean;
}

export type TipoDescuentoCupon = "PORCENTAJE" | "MONTO_FIJO_CENTAVOS";

export interface CuponPromocional {
  readonly codigo: string;
  readonly activo: boolean;
  readonly tipo: TipoDescuentoCupon;
  readonly valor: number;
  readonly validoDesde: Date;
  readonly validoHasta: Date;
  readonly usosActuales: number;
  readonly usosMaximos?: number;
  readonly montoMinimoCentavos?: number;
  readonly descuentoMaximoCentavos?: number;
  readonly serviciosElegiblesIds?: readonly string[];
}

export type MotivoCuponInvalido =
  | "CUPON_INACTIVO"
  | "CUPON_NO_VIGENTE"
  | "CUPON_EXPIRADO"
  | "CUPON_AGOTADO"
  | "MONTO_MINIMO_NO_ALCANZADO"
  | "SERVICIO_NO_ELEGIBLE";

export interface EvaluacionCuponResultado {
  readonly codigo: string;
  readonly aplicado: boolean;
  readonly descuentoCentavos: number;
  readonly motivoRechazo?: MotivoCuponInvalido;
}

export interface PoliticaAnticipoConfig {
  readonly porcentajeBase: number; // ej. 20
  readonly porcentajeAltoRiesgo?: number; // ej. 50 cuando hay historial no-show
  readonly montoMinimoParaAnticipoCentavos?: number;
}

export interface SolicitudCotizacion {
  readonly servicios: readonly ItemServicioCotizable[];
  readonly fechaCita: Date; // Fecha/hora programada de inicio
  readonly fechaCotizacion: Date; // Timestamp actual
  readonly horaInicio: string; // "HH:MM"
  readonly ocupacionDiaPorc?: number; // 0..100
  readonly historialNoShowsCliente?: number;
  readonly reglasDinamicas?: readonly ReglaTarifaDinamica[];
  readonly cupon?: CuponPromocional;
  readonly politicaAnticipo?: PoliticaAnticipoConfig;
}

export interface DetalleReglaAplicada {
  readonly reglaId: string;
  readonly nombre: string;
  readonly tipo: TipoReglaTarifa;
  readonly porcentajeAplicado: number;
  readonly impactoCentavos: number; // positivo = recargo, negativo = descuento
}

export interface ResultadoCotizacionReserva {
  readonly duracionTotalMin: number;
  readonly subtotalBaseCentavos: number;
  readonly reglasAplicadas: readonly DetalleReglaAplicada[];
  readonly ajusteDinamicoNetoCentavos: number;
  readonly subtotalAjustadoCentavos: number;
  readonly evaluacionCupon: EvaluacionCuponResultado | null;
  readonly descuentoCuponCentavos: number;
  readonly totalNetoCentavos: number;
  readonly anticipoRequeridoCentavos: number;
  readonly saldoEnSucursalCentavos: number;
  readonly porcentajeAnticipoAplicado: number;
}

const MS_POR_HORA = 3_600_000;

export class MotorTarificadorReservas {
  public static cotizar(solicitud: SolicitudCotizacion): ResultadoCotizacionReserva {
    if (!solicitud.servicios || solicitud.servicios.length === 0) {
      throw new Error("Debe seleccionar al menos un servicio para cotizar la reserva.");
    }

    let duracionTotalMin = 0;
    let subtotalBaseCentavos = 0;

    for (const item of solicitud.servicios) {
      if (!Number.isFinite(item.duracionMin) || item.duracionMin <= 0) {
        throw new Error(`Duración inválida para el servicio "${item.nombre}".`);
      }
      if (!Number.isInteger(item.precioCentavos) || item.precioCentavos < 0) {
        throw new Error(
          `El precio del servicio "${item.nombre}" debe ser un entero positivo en centavos.`
        );
      }
      duracionTotalMin += item.duracionMin;
      subtotalBaseCentavos += item.precioCentavos;
    }

    const reglasCandidatas = this.filtrarReglasAplicables(solicitud);
    const reglasSeleccionadas = this.resolverReglasApilables(reglasCandidatas);

    let ajusteDinamicoNetoCentavos = 0;
    const reglasAplicadas: DetalleReglaAplicada[] = [];

    for (const regla of reglasSeleccionadas) {
      const signo = this.obtenerSignoRegla(regla.tipo);
      const magnitudPorc = Math.abs(regla.porcentajeAjuste);
      const montoBruto = Math.round((subtotalBaseCentavos * magnitudPorc) / 100);
      const impactoCentavos = signo * montoBruto;

      ajusteDinamicoNetoCentavos += impactoCentavos;
      reglasAplicadas.push({
        reglaId: regla.id,
        nombre: regla.nombre,
        tipo: regla.tipo,
        porcentajeAplicado: signo * magnitudPorc,
        impactoCentavos,
      });
    }

    // Protegemos que el subtotal tras reglas dinámicas nunca baje de cero
    const subtotalAjustadoCentavos = Math.max(
      0,
      subtotalBaseCentavos + ajusteDinamicoNetoCentavos
    );
    const ajusteEfectivo = subtotalAjustadoCentavos - subtotalBaseCentavos;

    const evaluacionCupon = solicitud.cupon
      ? this.evaluarCupon(
          solicitud.cupon,
          subtotalAjustadoCentavos,
          solicitud.servicios,
          solicitud.fechaCotizacion
        )
      : null;

    const descuentoCuponCentavos = evaluacionCupon?.aplicado
      ? evaluacionCupon.descuentoCentavos
      : 0;

    const totalNetoCentavos = Math.max(0, subtotalAjustadoCentavos - descuentoCuponCentavos);

    const { anticipoCentavos, saldoCentavos, porcentajeAplicado } = this.calcularAnticipo(
      totalNetoCentavos,
      solicitud.politicaAnticipo,
      solicitud.historialNoShowsCliente ?? 0
    );

    return {
      duracionTotalMin,
      subtotalBaseCentavos,
      reglasAplicadas,
      ajusteDinamicoNetoCentavos: ajusteEfectivo,
      subtotalAjustadoCentavos,
      evaluacionCupon,
      descuentoCuponCentavos,
      totalNetoCentavos,
      anticipoRequeridoCentavos: anticipoCentavos,
      saldoEnSucursalCentavos: saldoCentavos,
      porcentajeAnticipoAplicado: porcentajeAplicado,
    };
  }

  private static filtrarReglasAplicables(
    solicitud: SolicitudCotizacion
  ): ReglaTarifaDinamica[] {
    const reglas = solicitud.reglasDinamicas ?? [];
    const diaSemana = solicitud.fechaCita.getDay();
    const minCita = horaAMinutos(solicitud.horaInicio);
    const horasAnticipacion =
      (solicitud.fechaCita.getTime() - solicitud.fechaCotizacion.getTime()) / MS_POR_HORA;
    const ocupacion = solicitud.ocupacionDiaPorc ?? 0;

    return reglas.filter((regla) => {
      if (!regla.activa) return false;

      if (regla.diasSemana && regla.diasSemana.length > 0) {
        if (!regla.diasSemana.includes(diaSemana)) return false;
      }

      if (regla.horaInicio && regla.horaFin) {
        const minIni = horaAMinutos(regla.horaInicio);
        const minFin = horaAMinutos(regla.horaFin);
        if (minCita < minIni || minCita >= minFin) return false;
      }

      if (regla.tipo === "DESCUENTO_PAQUETE") {
        const minSrv = regla.minServiciosPaquete ?? 2;
        if (solicitud.servicios.length < minSrv) return false;
      }

      if (regla.tipo === "RECARGO_PICO" && regla.ocupacionMinimaPorc !== undefined) {
        if (ocupacion < regla.ocupacionMinimaPorc) return false;
      }

      if (regla.tipo === "RECARGO_URGENCIA" && regla.anticipacionMaxHoras !== undefined) {
        if (horasAnticipacion < 0 || horasAnticipacion > regla.anticipacionMaxHoras) {
          return false;
        }
      }

      return true;
    });
  }

  private static resolverReglasApilables(
    candidatas: readonly ReglaTarifaDinamica[]
  ): ReglaTarifaDinamica[] {
    const apilables = candidatas.filter((r) => r.apilable === true);
    const exclusivas = candidatas.filter((r) => r.apilable !== true);

    if (exclusivas.length <= 1) {
      return [...exclusivas, ...apilables];
    }

    // Si hay múltiples reglas no apilables, priorizamos descuentos favorables al cliente
    // o bien la regla exclusiva de mayor impacto absoluto.
    const mejorExclusiva = [...exclusivas].sort((a, b) => {
      const impactoA = this.obtenerSignoRegla(a.tipo) * Math.abs(a.porcentajeAjuste);
      const impactoB = this.obtenerSignoRegla(b.tipo) * Math.abs(b.porcentajeAjuste);
      return impactoA - impactoB; // Más negativo (mayor descuento) primero
    })[0];

    return mejorExclusiva ? [mejorExclusiva, ...apilables] : apilables;
  }

  private static obtenerSignoRegla(tipo: TipoReglaTarifa): 1 | -1 {
    return tipo === "DESCUENTO_VALLE" || tipo === "DESCUENTO_PAQUETE" ? -1 : 1;
  }

  public static evaluarCupon(
    cupon: CuponPromocional,
    subtotalAjustadoCentavos: number,
    servicios: readonly ItemServicioCotizable[],
    ahora: Date
  ): EvaluacionCuponResultado {
    const codigoNormalizado = cupon.codigo.trim().toUpperCase();

    if (!cupon.activo) {
      return {
        codigo: codigoNormalizado,
        aplicado: false,
        descuentoCentavos: 0,
        motivoRechazo: "CUPON_INACTIVO",
      };
    }

    const ahoraMs = ahora.getTime();
    if (ahoraMs < cupon.validoDesde.getTime()) {
      return {
        codigo: codigoNormalizado,
        aplicado: false,
        descuentoCentavos: 0,
        motivoRechazo: "CUPON_NO_VIGENTE",
      };
    }

    if (ahoraMs > cupon.validoHasta.getTime()) {
      return {
        codigo: codigoNormalizado,
        aplicado: false,
        descuentoCentavos: 0,
        motivoRechazo: "CUPON_EXPIRADO",
      };
    }

    if (cupon.usosMaximos !== undefined && cupon.usosActuales >= cupon.usosMaximos) {
      return {
        codigo: codigoNormalizado,
        aplicado: false,
        descuentoCentavos: 0,
        motivoRechazo: "CUPON_AGOTADO",
      };
    }

    if (
      cupon.montoMinimoCentavos !== undefined &&
      subtotalAjustadoCentavos < cupon.montoMinimoCentavos
    ) {
      return {
        codigo: codigoNormalizado,
        aplicado: false,
        descuentoCentavos: 0,
        motivoRechazo: "MONTO_MINIMO_NO_ALCANZADO",
      };
    }

    if (cupon.serviciosElegiblesIds && cupon.serviciosElegiblesIds.length > 0) {
      const elegibles = new Set(cupon.serviciosElegiblesIds);
      const algunoElegible = servicios.some((s) => elegibles.has(s.servicioId));
      if (!algunoElegible) {
        return {
          codigo: codigoNormalizado,
          aplicado: false,
          descuentoCentavos: 0,
          motivoRechazo: "SERVICIO_NO_ELEGIBLE",
        };
      }
    }

    let descuento =
      cupon.tipo === "PORCENTAJE"
        ? Math.round((subtotalAjustadoCentavos * cupon.valor) / 100)
        : Math.round(cupon.valor);

    if (cupon.descuentoMaximoCentavos !== undefined) {
      descuento = Math.min(descuento, cupon.descuentoMaximoCentavos);
    }

    descuento = Math.max(0, Math.min(descuento, subtotalAjustadoCentavos));

    return {
      codigo: codigoNormalizado,
      aplicado: true,
      descuentoCentavos: descuento,
    };
  }

  private static calcularAnticipo(
    totalNetoCentavos: number,
    politica: PoliticaAnticipoConfig | undefined,
    noShows: number
  ): { anticipoCentavos: number; saldoCentavos: number; porcentajeAplicado: number } {
    if (!politica || totalNetoCentavos === 0) {
      return {
        anticipoCentavos: 0,
        saldoCentavos: totalNetoCentavos,
        porcentajeAplicado: 0,
      };
    }

    if (
      politica.montoMinimoParaAnticipoCentavos !== undefined &&
      totalNetoCentavos < politica.montoMinimoParaAnticipoCentavos &&
      noShows === 0
    ) {
      return {
        anticipoCentavos: 0,
        saldoCentavos: totalNetoCentavos,
        porcentajeAplicado: 0,
      };
    }

    const porc =
      noShows >= 1 && politica.porcentajeAltoRiesgo !== undefined
        ? Math.min(100, Math.max(0, politica.porcentajeAltoRiesgo))
        : Math.min(100, Math.max(0, politica.porcentajeBase));

    const anticipoCentavos = Math.round((totalNetoCentavos * porc) / 100);
    const saldoCentavos = totalNetoCentavos - anticipoCentavos;

    return {
      anticipoCentavos,
      saldoCentavos,
      porcentajeAplicado: porc,
    };
  }
}
