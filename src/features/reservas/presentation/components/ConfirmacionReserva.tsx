"use client";

import React, { useState } from "react";
import { NegocioPublico, ServicioPublico } from "../../domain/entities";
import {
  crearEventoDesdeCita,
  generarGoogleCalendarUrl,
  generarContenidoICS,
  generarNombreArchivoICS,
  calcularHoraFinSlot,
} from "../../domain/calendar";
import {
  formatearPrecio,
  formatearFechaLegible,
} from "../../domain/stepperReserva";
import { descargarArchivoICS } from "../utils/descargarArchivo";
import { ACCard, ACButton, ACBadge } from "@/shared/ui";
import {
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  CalendarPlus,
} from "lucide-react";

export interface ClienteConfirmacion {
  nombre: string;
  email: string;
  telefono?: string;
  notas?: string;
}

export interface ConfirmacionReservaProps {
  negocio: NegocioPublico;
  servicio: ServicioPublico;
  fecha: string; // Formato YYYY-MM-DD
  slot: string; // Formato HH:mm
  cliente: ClienteConfirmacion;
  codigoConfirmacion?: string;
  onNuevaReserva?: () => void;
  className?: string;
}

export const ConfirmacionReserva: React.FC<ConfirmacionReservaProps> = ({
  negocio,
  servicio,
  fecha,
  slot,
  cliente,
  codigoConfirmacion,
  onNuevaReserva,
  className = "",
}) => {
  const [descargado, setDescargado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const folio =
    codigoConfirmacion ||
    `CONF-${fecha.replace(/-/g, "")}-${slot.replace(":", "")}`;

  const horaFin = calcularHoraFinSlot(slot, servicio.duracionMin);
  const fechaLegible = formatearFechaLegible(fecha);

  // Instanciamos el evento normalizado de dominio
  const evento = crearEventoDesdeCita({
    servicioNombre: servicio.nombre,
    negocioNombre: negocio.nombre,
    fecha,
    slot,
    duracionMin: servicio.duracionMin,
    clienteNombre: cliente.nombre,
    clienteEmail: cliente.email,
    clienteTelefono: cliente.telefono,
    notas: cliente.notas,
    zonaHoraria: negocio.zonaHoraria,
    citaId: folio,
  });

  const urlGoogleCalendar = generarGoogleCalendarUrl(evento);

  const handleAbrirGoogleCalendar = () => {
    if (typeof window !== "undefined") {
      window.open(urlGoogleCalendar, "_blank", "noopener,noreferrer");
    }
  };

  const handleDescargarICS = () => {
    const contenidoICS = generarContenidoICS(evento);
    const nombreArchivo = generarNombreArchivoICS(servicio.nombre, fecha);
    const exito = descargarArchivoICS(nombreArchivo, contenidoICS);
    if (exito) {
      setDescargado(true);
      setTimeout(() => setDescargado(false), 3000);
    }
  };

  const handleCopiarResumen = async () => {
    const lineas = [
      `📅 RESERVA CONFIRMADA - ${negocio.nombre}`,
      "------------------------------------------",
      `Servicio: ${servicio.nombre}`,
      `Fecha: ${fechaLegible}`,
      `Horario: ${slot} ${horaFin ? `- ${horaFin} hrs` : ""} (${servicio.duracionMin} min)`,
      `Precio: ${formatearPrecio(servicio.precioCentavos)}`,
      `Cliente: ${cliente.nombre}`,
      `Correo: ${cliente.email}`,
      cliente.telefono ? `Teléfono: ${cliente.telefono}` : null,
      cliente.notas ? `Notas: ${cliente.notas}` : null,
      `Folio: #${folio}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(lineas);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }
    } catch (err) {
      console.error("No se pudo copiar al portapapeles:", err);
    }
  };

  return (
    <div
      role="region"
      aria-label="Confirmación de reserva"
      className={`w-full max-w-xl mx-auto my-6 sm:my-8 px-4 ${className}`}
    >
      <ACCard className="p-6 sm:p-10 text-center relative overflow-hidden shadow-md">
        {/* Ícono de confirmación */}
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
        </div>

        <ACBadge variante="exito" className="mb-3">
          Cita Confirmada
        </ACBadge>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight mb-2">
          ¡Tu cita ha sido reservada!
        </h2>
        <p className="text-sm text-zinc-600 max-w-md mx-auto mb-6">
          Hemos registrado tu reservación en <strong>{negocio.nombre}</strong>.
          Enviamos los detalles de tu cita a <strong>{cliente.email}</strong>.
        </p>

        {/* Tarjeta tipo Pase / Ticket de Cita */}
        <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-5 sm:p-6 text-left mb-6 space-y-4">
          {/* Fila 1: Servicio y Precio */}
          <div className="flex justify-between items-start border-b border-zinc-200/70 pb-3 gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                Servicio
              </span>
              <p className="text-base font-bold text-zinc-900 mt-0.5">
                {servicio.nombre}
              </p>
              {servicio.categoria && (
                <span className="text-[11px] text-zinc-500 font-medium">
                  {servicio.categoria}
                </span>
              )}
            </div>
            <span className="text-sm font-extrabold text-zinc-900 bg-white px-3 py-1 rounded-lg border border-zinc-200 font-mono shadow-2xs">
              {formatearPrecio(servicio.precioCentavos)}
            </span>
          </div>

          {/* Fila 2: Fecha y Horario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-zinc-200/70">
            <div>
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                Fecha
              </span>
              <p className="text-sm font-semibold text-zinc-800 capitalize mt-1">
                {fechaLegible}
              </p>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Horario
              </span>
              <p className="text-sm font-semibold text-zinc-800 mt-1">
                {slot} {horaFin ? `- ${horaFin} hrs` : ""}{" "}
                <span className="text-xs font-normal text-zinc-500">
                  ({servicio.duracionMin} min)
                </span>
              </p>
            </div>
          </div>

          {/* Fila 3: Negocio & Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-zinc-200/70">
            <div>
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Establecimiento
              </span>
              <p className="text-sm font-semibold text-zinc-800 mt-0.5">
                {negocio.nombre}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <ACBadge
                  variante="exito"
                  icono={<ShieldCheck className="w-3 h-3" />}
                  className="text-[10px] py-0.5 px-2"
                >
                  Verificado
                </ACBadge>
                <span className="text-[11px] text-zinc-400">
                  {negocio.zonaHoraria}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                Cliente
              </span>
              <p className="text-sm font-semibold text-zinc-900 mt-0.5">
                {cliente.nombre}
              </p>
              <div className="text-xs text-zinc-500 space-y-0.5 mt-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </div>
                {cliente.telefono && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fila 4: Notas si existen */}
          {cliente.notas && cliente.notas.trim() && (
            <div className="pb-3 border-b border-zinc-200/70 text-xs text-zinc-600">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Notas de la reserva
              </span>
              <p className="italic text-zinc-700 bg-white p-2.5 rounded-lg border border-zinc-200/70">
                {cliente.notas}
              </p>
            </div>
          )}

          {/* Fila 5: Folio de Confirmación */}
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
              Folio de Cita
            </span>
            <span className="font-mono font-bold text-zinc-700 bg-zinc-200/60 px-2 py-0.5 rounded">
              #{folio}
            </span>
          </div>
        </div>

        {/* Acciones de Calendario e Integración */}
        <div className="space-y-3 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block text-left">
            Agendar en tu calendario
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Botón Google Calendar */}
            <ACButton
              type="button"
              variante="primario"
              onClick={handleAbrirGoogleCalendar}
              iconoIzquierda={<CalendarPlus className="w-4 h-4" />}
              iconoDerecha={<ExternalLink className="w-3.5 h-3.5 opacity-70" />}
              aria-label="Agregar cita a Google Calendar"
              className="w-full justify-between"
            >
              Google Calendar
            </ACButton>

            {/* Botón Descargar Archivo .ICS */}
            <ACButton
              type="button"
              variante="contorno"
              onClick={handleDescargarICS}
              iconoIzquierda={
                descargado ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-600" />
                )
              }
              aria-label="Descargar archivo .ics estándar para Apple Calendar u Outlook"
              className="w-full justify-between"
            >
              {descargado ? "¡Descargado!" : "Descargar .ics"}
            </ACButton>
          </div>
        </div>

        {/* Acciones Secundarias: Copiar resumen y Nueva reserva */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-100">
          <ACButton
            type="button"
            variante="fantasma"
            onClick={handleCopiarResumen}
            iconoIzquierda={
              copiado ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-500" />
              )
            }
            className="w-full sm:w-auto text-xs"
            aria-label="Copiar resumen de la cita al portapapeles"
          >
            {copiado ? "¡Resumen copiado!" : "Copiar detalles"}
          </ACButton>

          <ACButton
            type="button"
            onClick={() => {
              if (onNuevaReserva) {
                onNuevaReserva();
              } else if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            variante="secundario"
            iconoIzquierda={<RotateCcw className="w-4 h-4" />}
            className="w-full sm:w-auto text-xs"
            aria-label="Reservar otra cita"
          >
            Reservar otra cita
          </ACButton>
        </div>
      </ACCard>
    </div>
  );
};
