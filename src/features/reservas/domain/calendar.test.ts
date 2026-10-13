import { describe, it, expect } from "vitest";
import {
  construirFechaHora,
  calcularFechaFin,
  calcularHoraFinSlot,
  crearEventoDesdeCita,
  formatearFechaISOCompactaUTC,
  formatearFechaLocalCompacta,
  generarGoogleCalendarUrl,
  escaparTextoICS,
  generarContenidoICS,
  generarNombreArchivoICS,
  DatosCitaParaCalendario,
  EventoCalendario,
} from "./calendar";

describe("Calendar & ICS Generator (Dominio Puro)", () => {
  describe("construirFechaHora", () => {
    it("construye un objeto Date válido a partir de fecha YYYY-MM-DD y hora HH:mm", () => {
      const date = construirFechaHora("2026-10-15", "10:30");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(9); // 0-indexed: 9 = octubre
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(10);
      expect(date.getMinutes()).toBe(30);
    });

    it("lanza error si el formato de fecha es inválido", () => {
      expect(() => construirFechaHora("15-10-2026", "10:00")).toThrow(
        /Formato de fecha inválido/
      );
      expect(() => construirFechaHora("", "10:00")).toThrow(
        /Formato de fecha inválido/
      );
    });

    it("lanza error si el formato de hora es inválido", () => {
      expect(() => construirFechaHora("2026-10-15", "10")).toThrow(
        /Formato de hora inválido/
      );
      expect(() => construirFechaHora("2026-10-15", "invalid")).toThrow(
        /Formato de hora inválido/
      );
    });
  });

  describe("calcularFechaFin", () => {
    it("suma la duración en minutos de forma precisa", () => {
      const inicio = new Date(2026, 9, 15, 10, 0, 0);
      const fin30 = calcularFechaFin(inicio, 30);
      expect(fin30.getHours()).toBe(10);
      expect(fin30.getMinutes()).toBe(30);

      const fin45 = calcularFechaFin(inicio, 45);
      expect(fin45.getHours()).toBe(10);
      expect(fin45.getMinutes()).toBe(45);

      const fin90 = calcularFechaFin(inicio, 90);
      expect(fin90.getHours()).toBe(11);
      expect(fin90.getMinutes()).toBe(30);
    });

    it("lanza error si la duración es menor o igual a cero", () => {
      const inicio = new Date(2026, 9, 15, 10, 0, 0);
      expect(() => calcularFechaFin(inicio, 0)).toThrow(
        /duración debe ser mayor a 0/
      );
      expect(() => calcularFechaFin(inicio, -15)).toThrow(
        /duración debe ser mayor a 0/
      );
    });
  });

  describe("calcularHoraFinSlot", () => {
    it("calcula la hora de fin sumando la duración en minutos", () => {
      expect(calcularHoraFinSlot("10:00", 30)).toBe("10:30");
      expect(calcularHoraFinSlot("10:45", 30)).toBe("11:15");
      expect(calcularHoraFinSlot("23:30", 45)).toBe("00:15");
    });

    it("retorna el mismo slot si la duración es 0 o menor", () => {
      expect(calcularHoraFinSlot("10:00", 0)).toBe("10:00");
    });

    it("retorna cadena vacía si el slot no tiene formato válido", () => {
      expect(calcularHoraFinSlot("invalid", 30)).toBe("");
    });
  });

  describe("crearEventoDesdeCita", () => {
    const citaMock: DatosCitaParaCalendario = {
      servicioNombre: "Corte Tradicional",
      negocioNombre: "Barbería Clásica",
      fecha: "2026-10-15",
      slot: "11:00",
      duracionMin: 45,
      clienteNombre: "Eduardo Maytorena",
      clienteEmail: "eduardo@outlook.com",
      clienteTelefono: "+52 662 123 4567",
      notas: "Corte al ras con tijera",
      zonaHoraria: "America/Hermosillo",
      citaId: "cita-xyz-100",
      direccion: "Blvd. Kino #500, Hermosillo, Sonora",
    };

    it("crea un EventoCalendario con todos los datos requeridos", () => {
      const evento = crearEventoDesdeCita(citaMock);

      expect(evento.id).toBe("cita-xyz-100");
      expect(evento.titulo).toBe("Corte Tradicional - Barbería Clásica");
      expect(evento.ubicacion).toBe("Blvd. Kino #500, Hermosillo, Sonora");
      expect(evento.zonaHoraria).toBe("America/Hermosillo");
      expect(evento.descripcion).toContain("Eduardo Maytorena");
      expect(evento.descripcion).toContain("eduardo@outlook.com");
      expect(evento.descripcion).toContain("+52 662 123 4567");
      expect(evento.descripcion).toContain("Corte al ras con tijera");
      expect(evento.descripcion).toContain("cita-xyz-100");
      expect(evento.organizador?.nombre).toBe("Barbería Clásica");
    });

    it("asigna valores por defecto si teléfono, notas o ID no están presentes", () => {
      const citaMinima: DatosCitaParaCalendario = {
        servicioNombre: "Afeitado",
        negocioNombre: "Barbería Clásica",
        fecha: "2026-10-15",
        slot: "12:00",
        duracionMin: 30,
        clienteNombre: "Juan Pérez",
        clienteEmail: "juan@test.com",
      };

      const evento = crearEventoDesdeCita(citaMinima);
      expect(evento.id).toBeDefined();
      expect(evento.id).toMatch(/^reserva-/);
      expect(evento.ubicacion).toBe("Barbería Clásica");
      expect(evento.descripcion).not.toContain("Teléfono:");
      expect(evento.descripcion).not.toContain("Notas:");
    });
  });

  describe("formatearFechaISOCompactaUTC y formatearFechaLocalCompacta", () => {
    it("formatea en UTC con terminación en Z", () => {
      const date = new Date(Date.UTC(2026, 9, 15, 17, 30, 0));
      const resultado = formatearFechaISOCompactaUTC(date);
      expect(resultado).toBe("20261015T173000Z");
    });

    it("formatea en hora local sin terminación Z", () => {
      const date = new Date(2026, 9, 15, 9, 5, 3);
      const resultado = formatearFechaLocalCompacta(date);
      expect(resultado).toBe("20261015T090503");
    });
  });

  describe("generarGoogleCalendarUrl", () => {
    it("genera una URL válida para Google Calendar con template y parámetros", () => {
      const inicio = new Date(Date.UTC(2026, 9, 15, 17, 0, 0));
      const fin = new Date(Date.UTC(2026, 9, 15, 17, 30, 0));

      const evento: EventoCalendario = {
        titulo: "Corte & Barba - Barbería VIP",
        descripcion: "Cita para Eduardo Maytorena\nServicio de 30 min",
        ubicacion: "Av. Principal 123",
        inicio,
        fin,
        zonaHoraria: "America/Hermosillo",
      };

      const urlStr = generarGoogleCalendarUrl(evento);
      expect(urlStr.startsWith("https://calendar.google.com/calendar/render")).toBe(true);

      const url = new URL(urlStr);
      expect(url.searchParams.get("action")).toBe("TEMPLATE");
      expect(url.searchParams.get("text")).toBe("Corte & Barba - Barbería VIP");
      expect(url.searchParams.get("dates")).toBe("20261015T170000Z/20261015T173000Z");
      expect(url.searchParams.get("location")).toBe("Av. Principal 123");
      expect(url.searchParams.get("ctz")).toBe("America/Hermosillo");
      expect(url.searchParams.get("details")).toContain("Eduardo Maytorena");
    });
  });

  describe("escaparTextoICS", () => {
    it("escapa comas, puntos y comas, barras invertidas y saltos de línea", () => {
      const texto = "Corte, barba; peinado \\ especial\nSegunda línea\r\nTercera línea";
      const escapado = escaparTextoICS(texto);
      expect(escapado).toContain("Corte\\, barba\\; peinado \\\\ especial");
      expect(escapado).toContain("\\nSegunda línea\\nTercera línea");
    });

    it("retorna cadena vacía para entradas vacías", () => {
      expect(escaparTextoICS("")).toBe("");
    });
  });

  describe("generarContenidoICS", () => {
    it("produce un archivo iCalendar RFC 5545 estándar válido", () => {
      const inicio = new Date(Date.UTC(2026, 9, 15, 16, 0, 0));
      const fin = new Date(Date.UTC(2026, 9, 15, 16, 45, 0));

      const evento: EventoCalendario = {
        id: "cita-folio-777",
        titulo: "Corte Clásico, Lavado y Peinado",
        descripcion: "Cliente: Eduardo Maytorena; Teléfono: 6621234567\nNotas: Estilo formal",
        ubicacion: "Hermosillo, Sonora",
        inicio,
        fin,
        organizador: {
          nombre: "Barbería Estilo",
          email: "admin@barberia.com",
        },
      };

      const ics = generarContenidoICS(evento);

      // Verificación de cabeceras estándar VCALENDAR
      expect(ics).toContain("BEGIN:VCALENDAR\r\n");
      expect(ics).toContain("VERSION:2.0\r\n");
      expect(ics).toContain("PRODID:-//AgendaCitas//ES\r\n");
      expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
      expect(ics).toContain("METHOD:PUBLISH\r\n");

      // Verificación de bloque VEVENT
      expect(ics).toContain("BEGIN:VEVENT\r\n");
      expect(ics).toContain("UID:cita-folio-777@agendacitas.io\r\n");
      expect(ics).toContain("DTSTAMP:");
      expect(ics).toContain("DTSTART:20261015T160000Z\r\n");
      expect(ics).toContain("DTEND:20261015T164500Z\r\n");
      expect(ics).toContain("SUMMARY:Corte Clásico\\, Lavado y Peinado\r\n");
      expect(ics).toContain("DESCRIPTION:Cliente: Eduardo Maytorena\\; Teléfono: 6621234567\\nNotas: Estilo formal\r\n");
      expect(ics).toContain("LOCATION:Hermosillo\\, Sonora\r\n");
      expect(ics).toContain("ORGANIZER;CN=Barbería Estilo:mailto:admin@barberia.com\r\n");
      expect(ics).toContain("STATUS:CONFIRMED\r\n");
      expect(ics).toContain("TRANSP:OPAQUE\r\n");
      expect(ics).toContain("END:VEVENT\r\n");
      expect(ics).toContain("END:VCALENDAR\r\n");

      // Verificación de terminación con CRLF
      expect(ics.endsWith("\r\n")).toBe(true);
    });
  });

  describe("generarNombreArchivoICS", () => {
    it("genera un nombre de archivo normalizado sin caracteres especiales ni acentos", () => {
      const nombre = generarNombreArchivoICS(
        "Corte Tradicional & Barba (Especial)",
        "2026-10-15"
      );
      expect(nombre).toBe("reserva-corte-tradicional-barba-especial-2026-10-15.ics");
    });

    it("maneja tildes y caracteres diacríticos correctamente", () => {
      const nombre = generarNombreArchivoICS("Depilación y Masaje", "2026-10-20");
      expect(nombre).toBe("reserva-depilacion-y-masaje-2026-10-20.ics");
    });
  });
});
