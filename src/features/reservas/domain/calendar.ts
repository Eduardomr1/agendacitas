/**
 * Generador desacoplado de enlaces para Google Calendar y archivos .ics (RFC 5545).
 * Capa de Dominio (Domain Layer) - Lógica pura sin dependencias de frameworks ni DOM.
 */

export interface EventoCalendario {
  readonly id?: string;
  readonly titulo: string;
  readonly descripcion?: string;
  readonly ubicacion?: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly zonaHoraria?: string;
  readonly url?: string;
  readonly organizador?: {
    nombre: string;
    email: string;
  };
}

export interface DatosCitaParaCalendario {
  readonly servicioNombre: string;
  readonly negocioNombre: string;
  readonly fecha: string; // Formato YYYY-MM-DD
  readonly slot: string; // Formato HH:mm (ej. "10:00")
  readonly duracionMin: number;
  readonly clienteNombre: string;
  readonly clienteEmail: string;
  readonly clienteTelefono?: string;
  readonly notas?: string;
  readonly zonaHoraria?: string;
  readonly direccion?: string;
  readonly citaId?: string;
}

/**
 * Convierte fecha YYYY-MM-DD y hora HH:mm a objeto Date.
 */
export function construirFechaHora(fecha: string, hora: string): Date {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error(`Formato de fecha inválido: "${fecha}". Se espera YYYY-MM-DD.`);
  }
  if (!hora || !/^\d{1,2}:\d{2}$/.test(hora.trim())) {
    throw new Error(`Formato de hora inválido: "${hora}". Se espera HH:mm.`);
  }

  const [año, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.trim().split(":").map(Number);

  return new Date(año, mes - 1, dia, horas, minutos, 0, 0);
}

/**
 * Calcula la fecha y hora de finalización sumando la duración en minutos.
 */
export function calcularFechaFin(inicio: Date, duracionMin: number): Date {
  if (duracionMin <= 0) {
    throw new Error("La duración debe ser mayor a 0 minutos.");
  }
  return new Date(inicio.getTime() + duracionMin * 60 * 1000);
}

/**
 * Calcula la hora de fin en formato HH:mm a partir de un slot de inicio y duración en minutos.
 */
export function calcularHoraFinSlot(slot: string, duracionMin: number): string {
  if (!slot || !/^\d{1,2}:\d{2}$/.test(slot.trim())) {
    return "";
  }
  if (duracionMin <= 0) {
    return slot;
  }
  const [horas, minutos] = slot.trim().split(":").map(Number);
  const totalMin = horas * 60 + minutos + duracionMin;
  const horasFin = Math.floor(totalMin / 60) % 24;
  const minFin = totalMin % 60;
  return `${String(horasFin).padStart(2, "0")}:${String(minFin).padStart(2, "0")}`;
}

/**
 * Convierte los datos de una cita confirmada en un EventoCalendario tipado.
 */
export function crearEventoDesdeCita(datos: DatosCitaParaCalendario): EventoCalendario {
  const inicio = construirFechaHora(datos.fecha, datos.slot);
  const fin = calcularFechaFin(inicio, datos.duracionMin);

  const titulo = `${datos.servicioNombre} - ${datos.negocioNombre}`;

  const lineasDescripcion: string[] = [
    `Cita confirmada en ${datos.negocioNombre}`,
    `Servicio: ${datos.servicioNombre} (${datos.duracionMin} min)`,
    `Cliente: ${datos.clienteNombre}`,
    `Correo: ${datos.clienteEmail}`,
  ];

  if (datos.clienteTelefono) {
    lineasDescripcion.push(`Teléfono: ${datos.clienteTelefono}`);
  }

  if (datos.notas && datos.notas.trim()) {
    lineasDescripcion.push(`Notas: ${datos.notas.trim()}`);
  }

  if (datos.citaId) {
    lineasDescripcion.push(`Código de reserva: ${datos.citaId}`);
  }

  return {
    id: datos.citaId || `reserva-${Date.now()}`,
    titulo,
    descripcion: lineasDescripcion.join("\n"),
    ubicacion: datos.direccion || datos.negocioNombre,
    inicio,
    fin,
    zonaHoraria: datos.zonaHoraria,
    organizador: {
      nombre: datos.negocioNombre,
      email: "contacto@agendacitas.io",
    },
  };
}

/**
 * Formatea un Date a cadena compacta UTC para Google Calendar e iCal: YYYYMMDDTHHmmssZ
 */
export function formatearFechaISOCompactaUTC(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = fecha.getUTCFullYear();
  const m = pad(fecha.getUTCMonth() + 1);
  const d = pad(fecha.getUTCDate());
  const h = pad(fecha.getUTCHours());
  const min = pad(fecha.getUTCMinutes());
  const s = pad(fecha.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Formatea un Date a cadena local YYYYMMDDTHHmmss
 */
export function formatearFechaLocalCompacta(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = fecha.getFullYear();
  const m = pad(fecha.getMonth() + 1);
  const d = pad(fecha.getDate());
  const h = pad(fecha.getHours());
  const min = pad(fecha.getMinutes());
  const s = pad(fecha.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * Genera el enlace de creación de evento para Google Calendar (action=TEMPLATE).
 */
export function generarGoogleCalendarUrl(evento: EventoCalendario): string {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams();

  params.set("action", "TEMPLATE");
  params.set("text", evento.titulo);

  // Usamos el formato UTC estándar para interoperabilidad global
  const inicioStr = formatearFechaISOCompactaUTC(evento.inicio);
  const finStr = formatearFechaISOCompactaUTC(evento.fin);
  params.set("dates", `${inicioStr}/${finStr}`);

  if (evento.descripcion) {
    params.set("details", evento.descripcion);
  }

  if (evento.ubicacion) {
    params.set("location", evento.ubicacion);
  }

  if (evento.zonaHoraria) {
    params.set("ctz", evento.zonaHoraria);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Escapa caracteres especiales según la especificación RFC 5545 para iCalendar.
 * Caracteres: backslash (\), punto y coma (;), coma (,) y saltos de línea (\n).
 */
export function escaparTextoICS(texto: string): string {
  if (!texto) return "";
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Genera el contenido en texto plano de un archivo estándar iCalendar (.ics) RFC 5545.
 */
export function generarContenidoICS(evento: EventoCalendario): string {
  const uid = evento.id
    ? `${evento.id}@agendacitas.io`
    : `cita-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@agendacitas.io`;

  const dtstamp = formatearFechaISOCompactaUTC(new Date());
  const dtstart = formatearFechaISOCompactaUTC(evento.inicio);
  const dtend = formatearFechaISOCompactaUTC(evento.fin);

  const lineas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgendaCitas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escaparTextoICS(evento.titulo)}`,
  ];

  if (evento.descripcion) {
    lineas.push(`DESCRIPTION:${escaparTextoICS(evento.descripcion)}`);
  }

  if (evento.ubicacion) {
    lineas.push(`LOCATION:${escaparTextoICS(evento.ubicacion)}`);
  }

  if (evento.organizador) {
    lineas.push(
      `ORGANIZER;CN=${escaparTextoICS(evento.organizador.nombre)}:mailto:${evento.organizador.email}`
    );
  }

  lineas.push("STATUS:CONFIRMED");
  lineas.push("TRANSP:OPAQUE");
  lineas.push("END:VEVENT");
  lineas.push("END:VCALENDAR");

  return lineas.join("\r\n") + "\r\n";
}

/**
 * Genera un nombre de archivo .ics limpio y normalizado.
 * Ejemplo: "reserva-corte-de-cabello-2026-10-15.ics"
 */
export function generarNombreArchivoICS(
  servicioNombre: string,
  fecha: string
): string {
  const slug = servicioNombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `reserva-${slug || "cita"}-${fecha || "fecha"}.ics`;
}
