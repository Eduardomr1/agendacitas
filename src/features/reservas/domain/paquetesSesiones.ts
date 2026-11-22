/**
 * Motor Puro de Paquetes de Sesiones Prepagadas, Billetera de Créditos y Canje FEFO/FIFO.
 *
 * Modela bonos multi-sesión y membresías prepagadas con validación estricta de
 * invariantes, prevención de sobre-canje o saldos negativos, selección automática
 * por expiración más próxima (FEFO) / antigüedad (FIFO), cálculo de reembolso
 * prorrateado en centavos enteros y conciliación de libro de movimientos.
 */

export type EstadoPaqueteSesiones =
  | "ACTIVO"
  | "AGOTADO"
  | "EXPIRADO"
  | "PAUSADO";

export type TipoMovimientoPaquete =
  | "COMPRA"
  | "CANJE"
  | "REVERSION_CANJE"
  | "BONIFICACION"
  | "AJUSTE_EXPIRACION"
  | "REEMBOLSO";

export type MotivoRechazoCanjePaquete =
  | "PAQUETE_INVALIDO"
  | "CLIENTE_NO_COINCIDE"
  | "NEGOCIO_NO_COINCIDE"
  | "CANTIDAD_SESIONES_INVALIDA"
  | "PAQUETE_PAUSADO"
  | "PAQUETE_EXPIRADO"
  | "PAQUETE_AGOTADO"
  | "SESIONES_INSUFICIENTES"
  | "SERVICIO_NO_CUBIERTO"
  | "CANJE_DUPLICADO";

export type MotivoNoReembolsable =
  | "PAQUETE_INVALIDO"
  | "PAQUETE_AGOTADO"
  | "PAQUETE_EXPIRADO"
  | "SIN_SESIONES_RESTANTES";

export interface PaqueteSesionesCliente {
  readonly id: string;
  readonly negocioId: string;
  readonly clienteId: string;
  readonly nombre: string;
  readonly sesionesTotales: number;
  readonly sesionesConsumidas: number;
  readonly serviciosCubiertosIds: readonly string[];
  readonly fechaCompra: Date;
  readonly fechaExpiracion: Date | null;
  readonly estado: EstadoPaqueteSesiones;
  readonly valorUnitarioCentavos: number;
  readonly precioPagadoTotalCentavos?: number;
  readonly prioridadOrden?: number;
}

export interface MovimientoCreditoPaquete {
  readonly id: string;
  readonly paqueteId: string;
  readonly clienteId: string;
  readonly tipo: TipoMovimientoPaquete;
  readonly sesionesDelta: number;
  readonly montoCentavosDelta: number;
  readonly citaId?: string;
  readonly servicioId?: string;
  readonly fecha: Date;
  readonly descripcion: string;
}

export interface SolicitudEvaluacionCanje {
  readonly paquete: PaqueteSesionesCliente;
  readonly servicioId: string;
  readonly ahora: Date;
  readonly clienteId?: string;
  readonly negocioId?: string;
  readonly sesionesRequeridas?: number;
  readonly citaId?: string;
  readonly citasYaCanjeadasIds?: readonly string[];
}

export interface ResultadoElegibilidadCanje {
  readonly elegible: boolean;
  readonly paqueteId: string;
  readonly estadoEfectivo: EstadoPaqueteSesiones;
  readonly sesionesDisponibles: number;
  readonly sesionesRequeridas: number;
  readonly sesionesRestantesDespues: number;
  readonly valorCanjeCentavos: number;
  readonly motivoRechazo?: MotivoRechazoCanjePaquete;
  readonly detalle?: string;
}

export interface SolicitudSeleccionMejorPaquete {
  readonly paquetes: readonly PaqueteSesionesCliente[];
  readonly servicioId: string;
  readonly ahora: Date;
  readonly clienteId?: string;
  readonly negocioId?: string;
  readonly sesionesRequeridas?: number;
  readonly citaId?: string;
  readonly citasYaCanjeadasIds?: readonly string[];
}

export interface PaqueteDescartadoResumen {
  readonly paqueteId: string;
  readonly motivo: MotivoRechazoCanjePaquete;
  readonly detalle?: string;
}

export interface ResultadoSeleccionPaquete {
  readonly seleccionado: boolean;
  readonly paqueteSeleccionado: PaqueteSesionesCliente | null;
  readonly elegibilidad: ResultadoElegibilidadCanje | null;
  readonly paquetesElegibles: readonly PaqueteSesionesCliente[];
  readonly paquetesDescartados: readonly PaqueteDescartadoResumen[];
  readonly motivoSinPaquete?:
    | MotivoRechazoCanjePaquete
    | "SIN_PAQUETES_DISPONIBLES";
}

export interface SolicitudEjecucionCanje {
  readonly paquete: PaqueteSesionesCliente;
  readonly servicioId: string;
  readonly citaId: string;
  readonly ahora: Date;
  readonly movimientoId?: string;
  readonly clienteId?: string;
  readonly negocioId?: string;
  readonly sesionesARedimir?: number;
  readonly citasYaCanjeadasIds?: readonly string[];
}

export interface ResultadoEjecucionCanje {
  readonly exito: boolean;
  readonly paqueteActualizado: PaqueteSesionesCliente | null;
  readonly movimientoGenerado: MovimientoCreditoPaquete | null;
  readonly elegibilidad: ResultadoElegibilidadCanje;
  readonly motivoRechazo?: MotivoRechazoCanjePaquete;
  readonly detalle?: string;
}

export interface SolicitudReversionCanje {
  readonly paquete: PaqueteSesionesCliente;
  readonly citaId: string;
  readonly ahora: Date;
  readonly sesionesARevertir?: number;
  readonly movimientoId?: string;
  readonly servicioId?: string;
}

export interface ResultadoReversionCanje {
  readonly exito: boolean;
  readonly paqueteActualizado: PaqueteSesionesCliente | null;
  readonly movimientoGenerado: MovimientoCreditoPaquete | null;
  readonly sesionesRestauradas: number;
  readonly valorRestauradoCentavos: number;
  readonly motivoRechazo?: string;
}

export interface SolicitudReembolsoProrrateado {
  readonly paquete: PaqueteSesionesCliente;
  readonly ahora: Date;
  readonly porcentajePenalizacion?: number;
  readonly cargoAdministrativoCentavos?: number;
  readonly permitirReembolsoSiExpirado?: boolean;
}

export interface ResultadoReembolsoProrrateado {
  readonly reembolsable: boolean;
  readonly paqueteId: string;
  readonly estadoEfectivo: EstadoPaqueteSesiones;
  readonly sesionesTotales: number;
  readonly sesionesConsumidas: number;
  readonly sesionesNoUtilizadas: number;
  readonly valorUnitarioCentavos: number;
  readonly valorBrutoNoUtilizadoCentavos: number;
  readonly penalizacionCentavos: number;
  readonly montoReembolsoNetoCentavos: number;
  readonly porcentajeNoUtilizado: number;
  readonly motivoNoReembolsable?: MotivoNoReembolsable;
  readonly detalle?: string;
}

export interface ResumenBalanceLibroCreditos {
  readonly sesionesAcreditadas: number;
  readonly sesionesConsumidasNetas: number;
  readonly sesionesDisponibles: number;
  readonly creditoAcreditadoCentavos: number;
  readonly creditoConsumidoNetoCentavos: number;
  readonly creditoDisponibleCentavos: number;
  readonly totalMovimientos: number;
  readonly integridadValida: boolean;
  readonly erroresIntegridad: readonly string[];
}

export interface ProximoVencimientoPaquete {
  readonly paqueteId: string;
  readonly nombre: string;
  readonly fechaExpiracion: Date;
  readonly sesionesRestantes: number;
  readonly diasRestantes: number;
}

export interface ResumenBilleteraCliente {
  readonly clienteId: string;
  readonly evaluadoEn: Date;
  readonly totalPaquetes: number;
  readonly paquetesActivos: number;
  readonly paquetesAgotados: number;
  readonly paquetesExpirados: number;
  readonly paquetesPausados: number;
  readonly sesionesTotalesContratadas: number;
  readonly sesionesConsumidasTotales: number;
  readonly sesionesDisponiblesActivas: number;
  readonly creditoDisponibleActivoCentavos: number;
  readonly creditoPausadoCentavos: number;
  readonly creditoExpiradoCentavos: number;
  readonly proximoAVencer: ProximoVencimientoPaquete | null;
  readonly serviciosCubiertosActivosIds: readonly string[];
}

export interface ResultadoConciliacionPaquete {
  readonly conciliado: boolean;
  readonly paqueteId: string;
  readonly sesionesDisponiblesPaquete: number;
  readonly sesionesDisponiblesLibro: number;
  readonly creditoRestantePaqueteCentavos: number;
  readonly creditoDisponibleLibroCentavos: number;
  readonly discrepancias: readonly string[];
}

const MS_POR_DIA = 86_400_000;
const ESTADOS_VALIDOS: ReadonlySet<EstadoPaqueteSesiones> = new Set([
  "ACTIVO",
  "AGOTADO",
  "EXPIRADO",
  "PAUSADO",
]);

function esFechaValida(fecha: Date): boolean {
  return fecha instanceof Date && Number.isFinite(fecha.getTime());
}

function calcularValorBrutoRestante(
  paquete: PaqueteSesionesCliente,
  sesionesRestantes: number
): number {
  if (sesionesRestantes <= 0) {
    return 0;
  }
  if (paquete.precioPagadoTotalCentavos !== undefined) {
    if (sesionesRestantes >= paquete.sesionesTotales) {
      return paquete.precioPagadoTotalCentavos;
    }
    return Math.floor(
      (paquete.precioPagadoTotalCentavos * sesionesRestantes) /
        paquete.sesionesTotales
    );
  }
  return sesionesRestantes * paquete.valorUnitarioCentavos;
}

function construirRechazoElegibilidad(
  paquete: PaqueteSesionesCliente,
  estadoEfectivo: EstadoPaqueteSesiones,
  sesionesDisponibles: number,
  sesionesRequeridas: number,
  motivoRechazo: MotivoRechazoCanjePaquete,
  detalle: string
): ResultadoElegibilidadCanje {
  return {
    elegible: false,
    paqueteId: paquete.id,
    estadoEfectivo,
    sesionesDisponibles,
    sesionesRequeridas,
    sesionesRestantesDespues: sesionesDisponibles,
    valorCanjeCentavos: 0,
    motivoRechazo,
    detalle,
  };
}

/**
 * Valida todas las invariantes estructurales y numéricas de un paquete de sesiones.
 */
export function validarPaqueteSesiones(
  paquete: PaqueteSesionesCliente
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (!paquete.id || !paquete.id.trim()) {
    errores.push("El id del paquete es obligatorio.");
  }
  if (!paquete.negocioId || !paquete.negocioId.trim()) {
    errores.push("El negocioId del paquete es obligatorio.");
  }
  if (!paquete.clienteId || !paquete.clienteId.trim()) {
    errores.push("El clienteId del paquete es obligatorio.");
  }
  if (!paquete.nombre || !paquete.nombre.trim()) {
    errores.push("El nombre del paquete es obligatorio.");
  }

  if (!Number.isInteger(paquete.sesionesTotales) || paquete.sesionesTotales <= 0) {
    errores.push(
      "Las sesionesTotales del paquete deben ser un entero mayor a 0."
    );
  }

  if (
    !Number.isInteger(paquete.sesionesConsumidas) ||
    paquete.sesionesConsumidas < 0
  ) {
    errores.push(
      "Las sesionesConsumidas del paquete deben ser un entero mayor o igual a 0."
    );
  } else if (
    Number.isInteger(paquete.sesionesTotales) &&
    paquete.sesionesConsumidas > paquete.sesionesTotales
  ) {
    errores.push(
      "Las sesionesConsumidas no pueden exceder las sesionesTotales del paquete."
    );
  }

  if (
    !Number.isInteger(paquete.valorUnitarioCentavos) ||
    paquete.valorUnitarioCentavos < 0
  ) {
    errores.push(
      "El valorUnitarioCentavos debe ser un entero mayor o igual a 0."
    );
  }

  if (
    paquete.precioPagadoTotalCentavos !== undefined &&
    (!Number.isInteger(paquete.precioPagadoTotalCentavos) ||
      paquete.precioPagadoTotalCentavos < 0)
  ) {
    errores.push(
      "El precioPagadoTotalCentavos debe ser un entero mayor o igual a 0."
    );
  }

  if (
    !Array.isArray(paquete.serviciosCubiertosIds) ||
    paquete.serviciosCubiertosIds.length === 0 ||
    paquete.serviciosCubiertosIds.some((s) => !s || !s.trim())
  ) {
    errores.push(
      "El paquete debe cubrir al menos un servicio con identificador válido."
    );
  }

  if (!esFechaValida(paquete.fechaCompra)) {
    errores.push("La fechaCompra del paquete debe ser una fecha válida.");
  }

  if (paquete.fechaExpiracion !== null) {
    if (!esFechaValida(paquete.fechaExpiracion)) {
      errores.push("La fechaExpiracion debe ser una fecha válida o null.");
    } else if (
      esFechaValida(paquete.fechaCompra) &&
      paquete.fechaExpiracion.getTime() < paquete.fechaCompra.getTime()
    ) {
      errores.push(
        "La fechaExpiracion no puede ser anterior a la fechaCompra del paquete."
      );
    }
  }

  if (!ESTADOS_VALIDOS.has(paquete.estado)) {
    errores.push("El estado del paquete no es válido.");
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Calcula las sesiones disponibles restantes garantizando que nunca sean negativas.
 */
export function calcularSesionesDisponibles(
  paquete: PaqueteSesionesCliente
): number {
  if (
    !Number.isInteger(paquete.sesionesTotales) ||
    !Number.isInteger(paquete.sesionesConsumidas) ||
    paquete.sesionesTotales <= 0 ||
    paquete.sesionesConsumidas < 0
  ) {
    return 0;
  }
  return Math.max(0, paquete.sesionesTotales - paquete.sesionesConsumidas);
}

/**
 * Determina el estado operativo efectivo de un paquete en el instante `ahora`,
 * priorizando caducidad temporal y agotamiento de saldo.
 */
export function obtenerEstadoEfectivoPaquete(
  paquete: PaqueteSesionesCliente,
  ahora: Date
): EstadoPaqueteSesiones {
  if (!esFechaValida(ahora)) {
    throw new Error("La fecha de referencia 'ahora' debe ser válida.");
  }

  if (paquete.estado === "EXPIRADO") {
    return "EXPIRADO";
  }

  if (paquete.estado === "AGOTADO" || calcularSesionesDisponibles(paquete) === 0) {
    return "AGOTADO";
  }

  if (
    paquete.fechaExpiracion !== null &&
    esFechaValida(paquete.fechaExpiracion) &&
    ahora.getTime() > paquete.fechaExpiracion.getTime()
  ) {
    return "EXPIRADO";
  }

  return paquete.estado;
}

/**
 * Evalúa si un paquete específico es elegible para canjear sesiones en una
 * reserva dada, previniendo sobre-canjes, canjes negativos, expiración o
 * incompatibilidad de servicio/cliente/negocio.
 */
export function evaluarElegibilidadCanje(
  solicitud: SolicitudEvaluacionCanje
): ResultadoElegibilidadCanje {
  const { paquete, servicioId, ahora } = solicitud;
  if (!esFechaValida(ahora)) {
    throw new Error("La fecha de referencia 'ahora' debe ser válida.");
  }

  const sesionesRequeridas = solicitud.sesionesRequeridas ?? 1;
  const validacion = validarPaqueteSesiones(paquete);
  const sesionesDisponibles = calcularSesionesDisponibles(paquete);

  if (!validacion.valido) {
    return construirRechazoElegibilidad(
      paquete,
      paquete.estado,
      sesionesDisponibles,
      sesionesRequeridas,
      "PAQUETE_INVALIDO",
      validacion.errores.join(" ")
    );
  }

  const estadoEfectivo = obtenerEstadoEfectivoPaquete(paquete, ahora);

  if (
    !Number.isInteger(sesionesRequeridas) ||
    sesionesRequeridas <= 0
  ) {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "CANTIDAD_SESIONES_INVALIDA",
      "La cantidad de sesiones a canjear debe ser un entero positivo mayor a 0."
    );
  }

  if (
    solicitud.negocioId !== undefined &&
    solicitud.negocioId.trim() !== paquete.negocioId.trim()
  ) {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "NEGOCIO_NO_COINCIDE",
      "El paquete pertenece a un negocio distinto al de la reserva."
    );
  }

  if (
    solicitud.clienteId !== undefined &&
    solicitud.clienteId.trim() !== paquete.clienteId.trim()
  ) {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "CLIENTE_NO_COINCIDE",
      "El paquete pertenece a otro cliente y no es transferible."
    );
  }

  if (
    solicitud.citaId &&
    solicitud.citasYaCanjeadasIds?.includes(solicitud.citaId.trim())
  ) {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "CANJE_DUPLICADO",
      `La cita "${solicitud.citaId}" ya registra un canje previo.`
    );
  }

  if (estadoEfectivo === "PAUSADO") {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "PAQUETE_PAUSADO",
      `El paquete "${paquete.nombre}" se encuentra pausado temporalmente.`
    );
  }

  if (estadoEfectivo === "EXPIRADO") {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "PAQUETE_EXPIRADO",
      `El paquete "${paquete.nombre}" expiró y no admite nuevos canjes.`
    );
  }

  if (estadoEfectivo === "AGOTADO" || sesionesDisponibles === 0) {
    return construirRechazoElegibilidad(
      paquete,
      "AGOTADO",
      0,
      sesionesRequeridas,
      "PAQUETE_AGOTADO",
      `El paquete "${paquete.nombre}" no cuenta con sesiones disponibles.`
    );
  }

  const servicioLimpio = servicioId.trim();
  const cubreServicio =
    servicioLimpio.length > 0 &&
    paquete.serviciosCubiertosIds.some((id) => id.trim() === servicioLimpio);

  if (!cubreServicio) {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "SERVICIO_NO_CUBIERTO",
      `El paquete "${paquete.nombre}" no incluye el servicio "${servicioId}".`
    );
  }

  if (sesionesRequeridas > sesionesDisponibles) {
    return construirRechazoElegibilidad(
      paquete,
      estadoEfectivo,
      sesionesDisponibles,
      sesionesRequeridas,
      "SESIONES_INSUFICIENTES",
      `El paquete "${paquete.nombre}" solo dispone de ${sesionesDisponibles} sesión(es) y se requieren ${sesionesRequeridas}.`
    );
  }

  const sesionesRestantesDespues = sesionesDisponibles - sesionesRequeridas;
  const valorCanjeCentavos =
    sesionesRequeridas * paquete.valorUnitarioCentavos;

  return {
    elegible: true,
    paqueteId: paquete.id,
    estadoEfectivo,
    sesionesDisponibles,
    sesionesRequeridas,
    sesionesRestantesDespues,
    valorCanjeCentavos,
  };
}

function compararPaquetesFEFO_FIFO(
  a: PaqueteSesionesCliente,
  b: PaqueteSesionesCliente
): number {
  // 1. Paquetes con fecha de expiración próxima primero (FEFO); sin expiración al final
  const expA = a.fechaExpiracion?.getTime() ?? Number.POSITIVE_INFINITY;
  const expB = b.fechaExpiracion?.getTime() ?? Number.POSITIVE_INFINITY;
  if (expA !== expB) {
    return expA - expB;
  }

  // 2. Compra más antigua primero (FIFO)
  const compraDiff = a.fechaCompra.getTime() - b.fechaCompra.getTime();
  if (compraDiff !== 0) {
    return compraDiff;
  }

  // 3. Menor saldo restante primero para consolidar paquetes casi agotados
  const saldoDiff =
    calcularSesionesDisponibles(a) - calcularSesionesDisponibles(b);
  if (saldoDiff !== 0) {
    return saldoDiff;
  }

  // 4. Prioridad manual descendente y desempate determinístico por id
  const prioDiff = (b.prioridadOrden ?? 0) - (a.prioridadOrden ?? 0);
  if (prioDiff !== 0) {
    return prioDiff;
  }

  return a.id.localeCompare(b.id);
}

/**
 * Selecciona automáticamente el mejor paquete elegible aplicando orden
 * FEFO (expiración más cercana primero) y desempate FIFO (compra más antigua).
 */
export function seleccionarMejorPaqueteParaReserva(
  solicitud: SolicitudSeleccionMejorPaquete
): ResultadoSeleccionPaquete {
  if (!esFechaValida(solicitud.ahora)) {
    throw new Error("La fecha de referencia 'ahora' debe ser válida.");
  }

  if (solicitud.paquetes.length === 0) {
    return {
      seleccionado: false,
      paqueteSeleccionado: null,
      elegibilidad: null,
      paquetesElegibles: [],
      paquetesDescartados: [],
      motivoSinPaquete: "SIN_PAQUETES_DISPONIBLES",
    };
  }

  const elegibles: Array<{
    paquete: PaqueteSesionesCliente;
    evaluacion: ResultadoElegibilidadCanje;
  }> = [];
  const descartados: PaqueteDescartadoResumen[] = [];

  for (const paquete of solicitud.paquetes) {
    const evaluacion = evaluarElegibilidadCanje({
      paquete,
      servicioId: solicitud.servicioId,
      ahora: solicitud.ahora,
      clienteId: solicitud.clienteId,
      negocioId: solicitud.negocioId,
      sesionesRequeridas: solicitud.sesionesRequeridas,
      citaId: solicitud.citaId,
      citasYaCanjeadasIds: solicitud.citasYaCanjeadasIds,
    });

    if (evaluacion.elegible) {
      elegibles.push({ paquete, evaluacion });
    } else {
      descartados.push({
        paqueteId: paquete.id,
        motivo: evaluacion.motivoRechazo ?? "PAQUETE_INVALIDO",
        detalle: evaluacion.detalle,
      });
    }
  }

  if (elegibles.length === 0) {
    return {
      seleccionado: false,
      paqueteSeleccionado: null,
      elegibilidad: null,
      paquetesElegibles: [],
      paquetesDescartados: descartados,
      motivoSinPaquete:
        descartados[0]?.motivo ?? "SIN_PAQUETES_DISPONIBLES",
    };
  }

  elegibles.sort((x, y) => compararPaquetesFEFO_FIFO(x.paquete, y.paquete));
  const ganador = elegibles[0]!;

  return {
    seleccionado: true,
    paqueteSeleccionado: ganador.paquete,
    elegibilidad: ganador.evaluacion,
    paquetesElegibles: elegibles.map((item) => item.paquete),
    paquetesDescartados: descartados,
  };
}

/**
 * Ejecuta el canje inmutable de sesiones sobre un paquete validado,
 * devolviendo la nueva instantánea del paquete y el asiento contable de crédito.
 */
export function ejecutarCanjeSesion(
  solicitud: SolicitudEjecucionCanje
): ResultadoEjecucionCanje {
  if (!solicitud.citaId || !solicitud.citaId.trim()) {
    throw new Error("El citaId es obligatorio para registrar el canje.");
  }

  const sesionesARedimir = solicitud.sesionesARedimir ?? 1;
  const elegibilidad = evaluarElegibilidadCanje({
    paquete: solicitud.paquete,
    servicioId: solicitud.servicioId,
    ahora: solicitud.ahora,
    clienteId: solicitud.clienteId,
    negocioId: solicitud.negocioId,
    sesionesRequeridas: sesionesARedimir,
    citaId: solicitud.citaId,
    citasYaCanjeadasIds: solicitud.citasYaCanjeadasIds,
  });

  if (!elegibilidad.elegible) {
    return {
      exito: false,
      paqueteActualizado: null,
      movimientoGenerado: null,
      elegibilidad,
      motivoRechazo: elegibilidad.motivoRechazo,
      detalle: elegibilidad.detalle,
    };
  }

  const nuevasConsumidas =
    solicitud.paquete.sesionesConsumidas + sesionesARedimir;
  const nuevoEstado: EstadoPaqueteSesiones =
    nuevasConsumidas >= solicitud.paquete.sesionesTotales
      ? "AGOTADO"
      : "ACTIVO";

  const paqueteActualizado: PaqueteSesionesCliente = {
    ...solicitud.paquete,
    sesionesConsumidas: nuevasConsumidas,
    estado: nuevoEstado,
  };

  const citaIdLimpio = solicitud.citaId.trim();
  const movimientoGenerado: MovimientoCreditoPaquete = {
    id:
      solicitud.movimientoId?.trim() ||
      `mov-canje-${solicitud.paquete.id}-${citaIdLimpio}`,
    paqueteId: solicitud.paquete.id,
    clienteId: solicitud.paquete.clienteId,
    tipo: "CANJE",
    sesionesDelta: -sesionesARedimir,
    montoCentavosDelta: -elegibilidad.valorCanjeCentavos,
    citaId: citaIdLimpio,
    servicioId: solicitud.servicioId.trim(),
    fecha: new Date(solicitud.ahora.getTime()),
    descripcion: `Canje de ${sesionesARedimir} sesión(es) en paquete "${solicitud.paquete.nombre}" para cita ${citaIdLimpio}.`,
  };

  return {
    exito: true,
    paqueteActualizado,
    movimientoGenerado,
    elegibilidad,
  };
}

/**
 * Revierte de forma segura un canje previo (por cancelación o reprogramación),
 * impidiendo que sesionesConsumidas descienda por debajo de cero.
 */
export function revertirCanjeSesion(
  solicitud: SolicitudReversionCanje
): ResultadoReversionCanje {
  if (!esFechaValida(solicitud.ahora)) {
    throw new Error("La fecha de referencia 'ahora' debe ser válida.");
  }
  if (!solicitud.citaId || !solicitud.citaId.trim()) {
    throw new Error("El citaId es obligatorio para revertir un canje.");
  }

  const validacion = validarPaqueteSesiones(solicitud.paquete);
  if (!validacion.valido) {
    return {
      exito: false,
      paqueteActualizado: null,
      movimientoGenerado: null,
      sesionesRestauradas: 0,
      valorRestauradoCentavos: 0,
      motivoRechazo: validacion.errores.join(" "),
    };
  }

  const sesionesARevertir = solicitud.sesionesARevertir ?? 1;
  if (!Number.isInteger(sesionesARevertir) || sesionesARevertir <= 0) {
    return {
      exito: false,
      paqueteActualizado: null,
      movimientoGenerado: null,
      sesionesRestauradas: 0,
      valorRestauradoCentavos: 0,
      motivoRechazo:
        "La cantidad de sesiones a revertir debe ser un entero positivo.",
    };
  }

  if (sesionesARevertir > solicitud.paquete.sesionesConsumidas) {
    return {
      exito: false,
      paqueteActualizado: null,
      movimientoGenerado: null,
      sesionesRestauradas: 0,
      valorRestauradoCentavos: 0,
      motivoRechazo: `No se pueden revertir ${sesionesARevertir} sesión(es) porque solo se han consumido ${solicitud.paquete.sesionesConsumidas}.`,
    };
  }

  const nuevasConsumidas =
    solicitud.paquete.sesionesConsumidas - sesionesARevertir;
  const expiradoPorFecha =
    solicitud.paquete.fechaExpiracion !== null &&
    solicitud.ahora.getTime() > solicitud.paquete.fechaExpiracion.getTime();

  let nuevoEstado: EstadoPaqueteSesiones;
  if (solicitud.paquete.estado === "EXPIRADO" || expiradoPorFecha) {
    nuevoEstado = "EXPIRADO";
  } else if (solicitud.paquete.estado === "PAUSADO") {
    nuevoEstado = "PAUSADO";
  } else {
    nuevoEstado = "ACTIVO";
  }

  const paqueteActualizado: PaqueteSesionesCliente = {
    ...solicitud.paquete,
    sesionesConsumidas: nuevasConsumidas,
    estado: nuevoEstado,
  };

  const valorRestauradoCentavos =
    sesionesARevertir * solicitud.paquete.valorUnitarioCentavos;
  const citaIdLimpio = solicitud.citaId.trim();

  const movimientoGenerado: MovimientoCreditoPaquete = {
    id:
      solicitud.movimientoId?.trim() ||
      `mov-rev-${solicitud.paquete.id}-${citaIdLimpio}`,
    paqueteId: solicitud.paquete.id,
    clienteId: solicitud.paquete.clienteId,
    tipo: "REVERSION_CANJE",
    sesionesDelta: sesionesARevertir,
    montoCentavosDelta: valorRestauradoCentavos,
    citaId: citaIdLimpio,
    servicioId: solicitud.servicioId?.trim(),
    fecha: new Date(solicitud.ahora.getTime()),
    descripcion: `Reversión de ${sesionesARevertir} sesión(es) al paquete "${solicitud.paquete.nombre}" por cancelación de cita ${citaIdLimpio}.`,
  };

  return {
    exito: true,
    paqueteActualizado,
    movimientoGenerado,
    sesionesRestauradas: sesionesARevertir,
    valorRestauradoCentavos,
  };
}

/**
 * Calcula el valor de reembolso prorrateado en centavos enteros para las
 * sesiones no utilizadas de un paquete, contemplando caducidad y penalizaciones.
 */
export function calcularValorReembolsoProrrateado(
  solicitud: SolicitudReembolsoProrrateado
): ResultadoReembolsoProrrateado {
  const { paquete, ahora } = solicitud;
  if (!esFechaValida(ahora)) {
    throw new Error("La fecha de referencia 'ahora' debe ser válida.");
  }

  if (
    solicitud.porcentajePenalizacion !== undefined &&
    (!Number.isFinite(solicitud.porcentajePenalizacion) ||
      solicitud.porcentajePenalizacion < 0 ||
      solicitud.porcentajePenalizacion > 100)
  ) {
    throw new Error(
      "El porcentajePenalizacion debe encontrarse entre 0 y 100."
    );
  }

  if (
    solicitud.cargoAdministrativoCentavos !== undefined &&
    (!Number.isInteger(solicitud.cargoAdministrativoCentavos) ||
      solicitud.cargoAdministrativoCentavos < 0)
  ) {
    throw new Error(
      "El cargoAdministrativoCentavos debe ser un entero mayor o igual a 0."
    );
  }

  const validacion = validarPaqueteSesiones(paquete);
  if (!validacion.valido) {
    return {
      reembolsable: false,
      paqueteId: paquete.id,
      estadoEfectivo: paquete.estado,
      sesionesTotales: paquete.sesionesTotales,
      sesionesConsumidas: paquete.sesionesConsumidas,
      sesionesNoUtilizadas: 0,
      valorUnitarioCentavos: paquete.valorUnitarioCentavos,
      valorBrutoNoUtilizadoCentavos: 0,
      penalizacionCentavos: 0,
      montoReembolsoNetoCentavos: 0,
      porcentajeNoUtilizado: 0,
      motivoNoReembolsable: "PAQUETE_INVALIDO",
      detalle: validacion.errores.join(" "),
    };
  }

  const estadoEfectivo = obtenerEstadoEfectivoPaquete(paquete, ahora);
  const sesionesNoUtilizadas = calcularSesionesDisponibles(paquete);
  const porcentajeNoUtilizado =
    Math.round((sesionesNoUtilizadas / paquete.sesionesTotales) * 10_000) / 100;

  if (estadoEfectivo === "AGOTADO" || sesionesNoUtilizadas === 0) {
    return {
      reembolsable: false,
      paqueteId: paquete.id,
      estadoEfectivo,
      sesionesTotales: paquete.sesionesTotales,
      sesionesConsumidas: paquete.sesionesConsumidas,
      sesionesNoUtilizadas: 0,
      valorUnitarioCentavos: paquete.valorUnitarioCentavos,
      valorBrutoNoUtilizadoCentavos: 0,
      penalizacionCentavos: 0,
      montoReembolsoNetoCentavos: 0,
      porcentajeNoUtilizado: 0,
      motivoNoReembolsable:
        estadoEfectivo === "AGOTADO"
          ? "PAQUETE_AGOTADO"
          : "SIN_SESIONES_RESTANTES",
      detalle: "El paquete no posee sesiones pendientes por reembolsar.",
    };
  }

  const valorBrutoNoUtilizadoCentavos = calcularValorBrutoRestante(
    paquete,
    sesionesNoUtilizadas
  );

  if (estadoEfectivo === "EXPIRADO" && !solicitud.permitirReembolsoSiExpirado) {
    return {
      reembolsable: false,
      paqueteId: paquete.id,
      estadoEfectivo,
      sesionesTotales: paquete.sesionesTotales,
      sesionesConsumidas: paquete.sesionesConsumidas,
      sesionesNoUtilizadas,
      valorUnitarioCentavos: paquete.valorUnitarioCentavos,
      valorBrutoNoUtilizadoCentavos,
      penalizacionCentavos: 0,
      montoReembolsoNetoCentavos: 0,
      porcentajeNoUtilizado,
      motivoNoReembolsable: "PAQUETE_EXPIRADO",
      detalle:
        "El paquete expiró y la política vigente no admite reembolso tras el vencimiento.",
    };
  }

  const penalizacionPorcentual =
    solicitud.porcentajePenalizacion !== undefined
      ? Math.round(
          (valorBrutoNoUtilizadoCentavos * solicitud.porcentajePenalizacion) /
            100
        )
      : 0;
  const cargoFijo = solicitud.cargoAdministrativoCentavos ?? 0;
  const penalizacionCentavos = Math.min(
    valorBrutoNoUtilizadoCentavos,
    penalizacionPorcentual + cargoFijo
  );
  const montoReembolsoNetoCentavos = Math.max(
    0,
    valorBrutoNoUtilizadoCentavos - penalizacionCentavos
  );

  return {
    reembolsable: montoReembolsoNetoCentavos > 0 || valorBrutoNoUtilizadoCentavos === 0,
    paqueteId: paquete.id,
    estadoEfectivo,
    sesionesTotales: paquete.sesionesTotales,
    sesionesConsumidas: paquete.sesionesConsumidas,
    sesionesNoUtilizadas,
    valorUnitarioCentavos: paquete.valorUnitarioCentavos,
    valorBrutoNoUtilizadoCentavos,
    penalizacionCentavos,
    montoReembolsoNetoCentavos,
    porcentajeNoUtilizado,
  };
}

/**
 * Reconstruye y audita el balance de sesiones y crédito en centavos a partir
 * de los asientos del libro de movimientos, detectando sobregiros negativos.
 */
export function calcularBalanceLibroCreditos(
  movimientos: readonly MovimientoCreditoPaquete[],
  paqueteId?: string
): ResumenBalanceLibroCreditos {
  const filtrados = (
    paqueteId
      ? movimientos.filter((m) => m.paqueteId === paqueteId)
      : movimientos
  )
    .slice()
    .sort((a, b) => {
      const diff = a.fecha.getTime() - b.fecha.getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

  let sesionesAcreditadas = 0;
  let sesionesConsumidasNetas = 0;
  let sesionesDisponibles = 0;
  let creditoAcreditadoCentavos = 0;
  let creditoConsumidoNetoCentavos = 0;
  let creditoDisponibleCentavos = 0;
  const erroresIntegridad: string[] = [];

  for (const mov of filtrados) {
    if (!Number.isInteger(mov.sesionesDelta)) {
      erroresIntegridad.push(
        `El movimiento "${mov.id}" tiene sesionesDelta no entero.`
      );
      continue;
    }
    if (!Number.isInteger(mov.montoCentavosDelta)) {
      erroresIntegridad.push(
        `El movimiento "${mov.id}" tiene montoCentavosDelta no entero.`
      );
      continue;
    }
    if (!esFechaValida(mov.fecha)) {
      erroresIntegridad.push(
        `El movimiento "${mov.id}" contiene una fecha inválida.`
      );
      continue;
    }

    if (mov.tipo === "COMPRA" || mov.tipo === "BONIFICACION") {
      sesionesAcreditadas += mov.sesionesDelta;
      creditoAcreditadoCentavos += mov.montoCentavosDelta;
    } else if (mov.tipo === "CANJE") {
      sesionesConsumidasNetas += Math.abs(mov.sesionesDelta);
      creditoConsumidoNetoCentavos += Math.abs(mov.montoCentavosDelta);
    } else if (mov.tipo === "REVERSION_CANJE") {
      sesionesConsumidasNetas -= mov.sesionesDelta;
      creditoConsumidoNetoCentavos -= mov.montoCentavosDelta;
    } else if (mov.tipo === "REEMBOLSO" || mov.tipo === "AJUSTE_EXPIRACION") {
      sesionesConsumidasNetas += Math.abs(mov.sesionesDelta);
      creditoConsumidoNetoCentavos += Math.abs(mov.montoCentavosDelta);
    }

    sesionesDisponibles += mov.sesionesDelta;
    creditoDisponibleCentavos += mov.montoCentavosDelta;

    if (sesionesDisponibles < 0) {
      erroresIntegridad.push(
        `Sobregiro de sesiones detectado tras movimiento "${mov.id}" (saldo: ${sesionesDisponibles}).`
      );
    }
    if (creditoDisponibleCentavos < 0) {
      erroresIntegridad.push(
        `Saldo de crédito negativo detectado tras movimiento "${mov.id}" (${creditoDisponibleCentavos} centavos).`
      );
    }
  }

  return {
    sesionesAcreditadas,
    sesionesConsumidasNetas,
    sesionesDisponibles,
    creditoAcreditadoCentavos,
    creditoConsumidoNetoCentavos,
    creditoDisponibleCentavos,
    totalMovimientos: filtrados.length,
    integridadValida: erroresIntegridad.length === 0,
    erroresIntegridad,
  };
}

/**
 * Resume la billetera prepagada completa de un cliente en el instante `ahora`.
 */
export function calcularResumenBilleteraCliente(
  paquetes: readonly PaqueteSesionesCliente[],
  ahora: Date,
  clienteId?: string
): ResumenBilleteraCliente {
  if (!esFechaValida(ahora)) {
    throw new Error("La fecha de referencia 'ahora' debe ser válida.");
  }

  const filtrados = clienteId
    ? paquetes.filter((p) => p.clienteId === clienteId)
    : paquetes;

  let paquetesActivos = 0;
  let paquetesAgotados = 0;
  let paquetesExpirados = 0;
  let paquetesPausados = 0;
  let sesionesTotalesContratadas = 0;
  let sesionesConsumidasTotales = 0;
  let sesionesDisponiblesActivas = 0;
  let creditoDisponibleActivoCentavos = 0;
  let creditoPausadoCentavos = 0;
  let creditoExpiradoCentavos = 0;
  let proximoAVencer: ProximoVencimientoPaquete | null = null;
  const serviciosActivos = new Set<string>();

  for (const paquete of filtrados) {
    const estadoEfectivo = obtenerEstadoEfectivoPaquete(paquete, ahora);
    const sesionesRestantes = calcularSesionesDisponibles(paquete);
    const valorRestante = calcularValorBrutoRestante(
      paquete,
      sesionesRestantes
    );

    sesionesTotalesContratadas += Math.max(0, paquete.sesionesTotales);
    sesionesConsumidasTotales += Math.max(0, paquete.sesionesConsumidas);

    if (estadoEfectivo === "ACTIVO") {
      paquetesActivos += 1;
      sesionesDisponiblesActivas += sesionesRestantes;
      creditoDisponibleActivoCentavos += valorRestante;
      for (const srvId of paquete.serviciosCubiertosIds) {
        serviciosActivos.add(srvId);
      }

      if (paquete.fechaExpiracion !== null) {
        const diasRestantes = Math.max(
          0,
          Math.ceil(
            (paquete.fechaExpiracion.getTime() - ahora.getTime()) / MS_POR_DIA
          )
        );
        if (
          !proximoAVencer ||
          paquete.fechaExpiracion.getTime() <
            proximoAVencer.fechaExpiracion.getTime()
        ) {
          proximoAVencer = {
            paqueteId: paquete.id,
            nombre: paquete.nombre,
            fechaExpiracion: paquete.fechaExpiracion,
            sesionesRestantes,
            diasRestantes,
          };
        }
      }
    } else if (estadoEfectivo === "AGOTADO") {
      paquetesAgotados += 1;
    } else if (estadoEfectivo === "EXPIRADO") {
      paquetesExpirados += 1;
      creditoExpiradoCentavos += valorRestante;
    } else if (estadoEfectivo === "PAUSADO") {
      paquetesPausados += 1;
      creditoPausadoCentavos += valorRestante;
    }
  }

  return {
    clienteId: clienteId ?? filtrados[0]?.clienteId ?? "",
    evaluadoEn: ahora,
    totalPaquetes: filtrados.length,
    paquetesActivos,
    paquetesAgotados,
    paquetesExpirados,
    paquetesPausados,
    sesionesTotalesContratadas,
    sesionesConsumidasTotales,
    sesionesDisponiblesActivas,
    creditoDisponibleActivoCentavos,
    creditoPausadoCentavos,
    creditoExpiradoCentavos,
    proximoAVencer,
    serviciosCubiertosActivosIds: Array.from(serviciosActivos).sort(),
  };
}

/**
 * Concilia la instantánea actual de un paquete contra los asientos del libro
 * de movimientos para verificar consistencia de sesiones y saldo en centavos.
 */
export function conciliarPaqueteConLibro(
  paquete: PaqueteSesionesCliente,
  movimientos: readonly MovimientoCreditoPaquete[]
): ResultadoConciliacionPaquete {
  const balance = calcularBalanceLibroCreditos(movimientos, paquete.id);
  const sesionesDisponiblesPaquete = calcularSesionesDisponibles(paquete);
  const creditoRestantePaqueteCentavos = calcularValorBrutoRestante(
    paquete,
    sesionesDisponiblesPaquete
  );
  const discrepancias = [...balance.erroresIntegridad];

  if (sesionesDisponiblesPaquete !== balance.sesionesDisponibles) {
    discrepancias.push(
      `Desfase de sesiones: el paquete reporta ${sesionesDisponiblesPaquete} disponible(s) pero el libro suma ${balance.sesionesDisponibles}.`
    );
  }

  if (creditoRestantePaqueteCentavos !== balance.creditoDisponibleCentavos) {
    discrepancias.push(
      `Desfase monetario: el paquete reporta ${creditoRestantePaqueteCentavos} centavos pero el libro suma ${balance.creditoDisponibleCentavos} centavos.`
    );
  }

  return {
    conciliado: discrepancias.length === 0,
    paqueteId: paquete.id,
    sesionesDisponiblesPaquete,
    sesionesDisponiblesLibro: balance.sesionesDisponibles,
    creditoRestantePaqueteCentavos,
    creditoDisponibleLibroCentavos: balance.creditoDisponibleCentavos,
    discrepancias,
  };
}
