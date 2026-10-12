"use client";

import React, { useState } from "react";
import { ServicioPublico, NegocioPublico } from "../../domain/entities";
import { ACCard, ACButton, ACInput, ACTextarea } from "@/shared/ui";
import {
  User,
  Mail,
  Phone,
  FileText,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  validarPaso3,
  formatearPrecio,
  formatearFechaLegible,
} from "../../domain/stepperReserva";

interface PasoContactoProps {
  negocio: NegocioPublico;
  servicio?: ServicioPublico;
  fecha: string;
  slot: string;
  nombre: string;
  email: string;
  telefono?: string;
  notas?: string;
  cargando?: boolean;
  onCambiarNombre: (nombre: string) => void;
  onCambiarEmail: (email: string) => void;
  onCambiarTelefono: (telefono: string) => void;
  onCambiarNotas: (notas: string) => void;
  onAtras: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const PasoContacto: React.FC<PasoContactoProps> = ({
  negocio,
  servicio,
  fecha,
  slot,
  nombre,
  email,
  telefono = "",
  notas = "",
  cargando = false,
  onCambiarNombre,
  onCambiarEmail,
  onCambiarTelefono,
  onCambiarNotas,
  onAtras,
  onSubmit,
}) => {
  const [tocado, setTocado] = useState<{
    nombre?: boolean;
    email?: boolean;
    telefono?: boolean;
    notas?: boolean;
  }>({});

  const validacion = validarPaso3({
    nombre,
    email,
    telefono,
    notas,
  });

  const fechaLegible = formatearFechaLegible(fecha);

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen previo de confirmación */}
      <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-5 sm:p-6">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-3">
          Resumen de tu selección
        </span>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80">
          <div>
            <h4 className="text-base font-bold text-zinc-900">
              {servicio?.nombre || "Servicio no seleccionado"}
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              En {negocio.nombre}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-base font-extrabold text-zinc-900 font-mono">
              {formatearPrecio(servicio?.precioCentavos || 0)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-medium capitalize">{fechaLegible}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-medium">
              {slot} ({servicio?.duracionMin || 0} minutos)
            </span>
          </div>
        </div>
      </div>

      {/* Formulario de Datos */}
      <ACCard
        titulo="3. Datos del Cliente"
        subtitulo="Ingresa la información requerida para confirmar tu reservación"
        className="p-6 md:p-8"
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {/* Nombre completo */}
          <ACInput
            id="cliente-nombre"
            name="nombre"
            etiqueta="Nombre Completo *"
            placeholder="Ej. Juan Pérez"
            value={nombre}
            onChange={(e) => onCambiarNombre(e.target.value)}
            onBlur={() => setTocado((prev) => ({ ...prev, nombre: true }))}
            error={tocado.nombre ? validacion.errores.nombre : undefined}
            required
            aria-required="true"
            aria-invalid={tocado.nombre && !!validacion.errores.nombre}
            icono={<User className="w-4 h-4" />}
          />

          {/* Email y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ACInput
              id="cliente-email"
              name="email"
              type="email"
              etiqueta="Correo Electrónico *"
              placeholder="juan@ejemplo.com"
              value={email}
              onChange={(e) => onCambiarEmail(e.target.value)}
              onBlur={() => setTocado((prev) => ({ ...prev, email: true }))}
              error={tocado.email ? validacion.errores.email : undefined}
              required
              aria-required="true"
              aria-invalid={tocado.email && !!validacion.errores.email}
              icono={<Mail className="w-4 h-4" />}
            />

            <ACInput
              id="cliente-telefono"
              name="telefono"
              type="tel"
              etiqueta="Teléfono (Opcional)"
              placeholder="+52 662 123 4567"
              value={telefono}
              onChange={(e) => onCambiarTelefono(e.target.value)}
              onBlur={() => setTocado((prev) => ({ ...prev, telefono: true }))}
              error={tocado.telefono ? validacion.errores.telefono : undefined}
              aria-invalid={tocado.telefono && !!validacion.errores.telefono}
              icono={<Phone className="w-4 h-4" />}
            />
          </div>

          {/* Notas u observaciones */}
          <div className="relative">
            <ACTextarea
              id="cliente-notas"
              name="notas"
              etiqueta="Notas o Indicaciones Especiales (Opcional)"
              placeholder="Ej. Preferencias de atención, dudas o cualquier indicación para el negocio..."
              value={notas}
              onChange={(e) => onCambiarNotas(e.target.value)}
              onBlur={() => setTocado((prev) => ({ ...prev, notas: true }))}
              error={tocado.notas ? validacion.errores.notas : undefined}
              rows={3}
              ayuda={`${notas.length}/500 caracteres`}
            />
          </div>

          {/* Nota de privacidad y confirmación segura */}
          <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl text-xs text-zinc-500 border border-zinc-200/60">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Tus datos sólo se usarán para contactarte sobre tu cita. Recibirás un correo con la confirmación.
            </span>
          </div>

          {/* Navegación y acción final */}
          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <ACButton
              type="button"
              variante="contorno"
              onClick={onAtras}
              disabled={cargando}
              iconoIzquierda={<ArrowLeft className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Atrás (Cambiar Horario)
            </ACButton>

            <ACButton
              type="submit"
              variante="primario"
              cargando={cargando}
              disabled={!validacion.esValido}
              iconoDerecha={<CheckCircle2 className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Confirmar Reservación
            </ACButton>
          </div>
        </form>
      </ACCard>
    </div>
  );
};
