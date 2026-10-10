import { CitaAdminItem } from "./entities";

export interface MetricasCitasResult {
  totalCitas: number;
  confirmadas: number;
  completadas: number;
  canceladas: number;
  ingresosCentavos: number;
  tasaEfectividad: number; // Porcentaje (0 - 100)
  ticketPromedioCentavos: number;
  clientesUnicos: number;
  clientesRecurrentes: number;
  tasaRecurrencia: number; // Porcentaje (0 - 100)
}

/**
 * Calcula indicadores clave de rendimiento (KPIs) sobre un lote de citas.
 */
export function calcularMetricasCitas(citas: CitaAdminItem[]): MetricasCitasResult {
  const totalCitas = citas.length;
  const confirmadas = citas.filter((c) => c.estado === "confirmada").length;
  const completadas = citas.filter((c) => c.estado === "completada").length;
  const canceladas = citas.filter((c) => c.estado === "cancelada").length;

  const validas = confirmadas + completadas;
  const ingresosCentavos = citas
    .filter((c) => c.estado === "confirmada" || c.estado === "completada")
    .reduce((sum, c) => sum + c.precioCentavos, 0);

  const tasaEfectividad =
    totalCitas > 0 ? Math.round((validas / totalCitas) * 100) : 100;

  const ticketPromedioCentavos =
    validas > 0 ? Math.round(ingresosCentavos / validas) : 0;

  // Cálculo de recurrencia de clientes
  const citasPorCliente: Record<string, number> = {};
  for (const cita of citas) {
    const clave = (cita.clienteEmail || cita.clienteNombre).toLowerCase().trim();
    citasPorCliente[clave] = (citasPorCliente[clave] || 0) + 1;
  }

  const clientesArray = Object.values(citasPorCliente);
  const clientesUnicos = clientesArray.length;
  const clientesRecurrentes = clientesArray.filter((count) => count > 1).length;
  const tasaRecurrencia =
    clientesUnicos > 0 ? Math.round((clientesRecurrentes / clientesUnicos) * 100) : 0;

  return {
    totalCitas,
    confirmadas,
    completadas,
    canceladas,
    ingresosCentavos,
    tasaEfectividad,
    ticketPromedioCentavos,
    clientesUnicos,
    clientesRecurrentes,
    tasaRecurrencia,
  };
}

/**
 * Obtiene el inicio de la semana (Lunes a las 00:00:00) para una fecha dada.
 */
export function obtenerInicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const day = d.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
  // Ajuste: si es Domingo (0), restar 6 para ir al Lunes anterior. Sino, restar day - 1.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Genera un array de 7 fechas (Lunes a Domingo) para la semana que contiene la fecha dada.
 */
export function obtenerDiasDeSemana(fechaReferencia: Date): Date[] {
  const lunes = obtenerInicioDeSemana(fechaReferencia);
  const dias: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    dias.push(dia);
  }
  return dias;
}

/**
 * Determina si dos fechas corresponden al mismo día natural (año, mes, día).
 */
export function esMismoDia(d1: Date, d2: Date): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Formatea un rango semanal para presentación visual amigable.
 * Ejemplo: "12 – 18 de oct 2026" o "28 de sep – 4 de oct 2026".
 */
export function formatearRangoSemana(dias: Date[]): string {
  if (dias.length === 0) return "";
  const inicio = dias[0];
  const fin = dias[dias.length - 1];

  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];

  if (inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear()) {
    return `${inicio.getDate()} – ${fin.getDate()} de ${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
  }

  if (inicio.getFullYear() === fin.getFullYear()) {
    return `${inicio.getDate()} ${meses[inicio.getMonth()]} – ${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`;
  }

  return `${inicio.getDate()} ${meses[inicio.getMonth()]} ${inicio.getFullYear()} – ${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`;
}
