"use client";

import React, { useState } from "react";
import { NegocioPublico, ServicioPublico } from "../domain/entities";
import { ACCard, ACButton, ACInput, ACCalendar, ACBadge } from "@/shared/ui";
import {
  Clock,
  DollarSign,
  Calendar as CalendarIcon,
  CheckCircle2,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  Phone,
} from "lucide-react";

interface ReservasViewProps {
  negocio: NegocioPublico;
  servicios: ServicioPublico[];
  slotsDisponibles: string[];
  fechaSeleccionada: string;
  servicioSeleccionadoId?: string;
  onCambiarFecha: (fecha: string) => void;
  onCambiarServicio: (servicioId: string) => void;
  onConfirmarReserva: (datos: {
    slot: string;
    nombre: string;
    email: string;
    telefono: string;
  }) => Promise<void>;
  cargando?: boolean;
  error?: string;
  exito?: boolean;
}

export const ReservasView: React.FC<ReservasViewProps> = ({
  negocio,
  servicios,
  slotsDisponibles,
  fechaSeleccionada,
  servicioSeleccionadoId,
  onCambiarFecha,
  onCambiarServicio,
  onConfirmarReserva,
  cargando = false,
  error,
  exito = false,
}) => {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [slotSeleccionado, setSlotSeleccionado] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [fechaMinima, setFechaMinima] = useState<string>("");

  React.useEffect(() => {
    setFechaMinima(new Date().toISOString().split("T")[0]);
  }, []);

  const servicioActivo = servicios.find((s) => s.id === servicioSeleccionadoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSeleccionado) return;
    await onConfirmarReserva({
      slot: slotSeleccionado,
      nombre,
      email,
      telefono,
    });
  };

  const formatearFechaLegible = (f: string) => {
    if (!f) return "";
    const [y, m, d] = f.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (exito) {
    return (
      <div className="max-w-xl mx-auto my-12 px-4">
        <ACCard className="text-center p-8 md:p-12 relative overflow-hidden">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <ACBadge variante="exito" className="mb-3">
            Confirmada
          </ACBadge>

          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">
            ¡Tu cita ha sido reservada!
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-8">
            Hemos registrado tu reservación en <strong>{negocio.nombre}</strong>.
            Recibirás los detalles en <strong>{email}</strong>.
          </p>

          {/* Tarjeta tipo Pase de Cita */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-6 text-left mb-8 space-y-4">
            <div className="flex justify-between items-start border-b border-zinc-200/60 pb-4">
              <div>
                <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                  Servicio
                </span>
                <p className="text-base font-bold text-zinc-900 mt-0.5">
                  {servicioActivo?.nombre}
                </p>
              </div>
              <span className="text-sm font-extrabold text-zinc-900 bg-white px-3 py-1 rounded-lg border border-zinc-200">
                ${((servicioActivo?.precioCentavos || 0) / 100).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                  Fecha
                </span>
                <p className="text-sm font-semibold text-zinc-800 capitalize mt-0.5">
                  {formatearFechaLegible(fechaSeleccionada)}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                  Horario
                </span>
                <p className="text-sm font-semibold text-zinc-800 mt-0.5">
                  {slotSeleccionado} ({servicioActivo?.duracionMin} min)
                </p>
              </div>
            </div>
          </div>

          <ACButton
            onClick={() => window.location.reload()}
            variante="primario"
            className="w-full sm:w-auto"
          >
            Reservar otra cita
          </ACButton>
        </ACCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto my-8 px-4">
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200/80 text-rose-700 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Contenedor Cal.com en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Información del Negocio y Resumen Dinámico */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-8">
          <ACCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                {negocio.nombre.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {negocio.nombre}
                </h1>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{negocio.zonaHoraria}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center gap-2">
              <ACBadge variante="exito" icono={<ShieldCheck className="w-3.5 h-3.5" />}>
                Verificado
              </ACBadge>
              <span className="text-xs text-zinc-400">Reserva online instantánea</span>
            </div>

            {/* Resumen dinámico en vivo */}
            <div className="mt-6 pt-6 border-t border-zinc-100 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Resumen de la cita
              </span>

              {servicioActivo ? (
                <div className="space-y-3 bg-zinc-50/80 rounded-xl p-4 border border-zinc-200/60">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-zinc-900">
                      {servicioActivo.nombre}
                    </span>
                    <span className="text-sm font-bold text-zinc-900">
                      ${(servicioActivo.precioCentavos / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {servicioActivo.duracionMin} min
                    </span>
                    {slotSeleccionado && (
                      <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                        <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                        {slotSeleccionado}
                      </span>
                    )}
                  </div>

                  {fechaSeleccionada && (
                    <p className="text-xs text-zinc-600 capitalize pt-1 border-t border-zinc-200/40">
                      {formatearFechaLegible(fechaSeleccionada)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-zinc-200/80 rounded-xl">
                  <Sparkles className="w-5 h-5 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">
                    Selecciona un servicio para comenzar
                  </p>
                </div>
              )}
            </div>
          </ACCard>
        </div>

        {/* Columna Derecha: Flujo interactivo por pasos */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Navegador de Pasos (Breadcrumb visual) */}
          <div className="flex items-center gap-2 bg-white rounded-2xl p-2 border border-zinc-200/80 shadow-xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPaso(1)}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer text-center ${
                paso === 1
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              1. Servicio
            </button>
            <span className="text-zinc-300">/</span>
            <button
              type="button"
              disabled={!servicioActivo}
              onClick={() => setPaso(2)}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center ${
                paso === 2
                  ? "bg-zinc-900 text-white shadow-xs"
                  : !servicioActivo
                  ? "text-zinc-300 cursor-not-allowed"
                  : "text-zinc-600 hover:text-zinc-900 cursor-pointer"
              }`}
            >
              2. Horario
            </button>
            <span className="text-zinc-300">/</span>
            <button
              type="button"
              disabled={!slotSeleccionado}
              onClick={() => setPaso(3)}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center ${
                paso === 3
                  ? "bg-zinc-900 text-white shadow-xs"
                  : !slotSeleccionado
                  ? "text-zinc-300 cursor-not-allowed"
                  : "text-zinc-600 hover:text-zinc-900 cursor-pointer"
              }`}
            >
              3. Confirmar
            </button>
          </div>

          {/* PASO 1: Selección de Servicio */}
          {paso === 1 && (
            <ACCard
              titulo="Elige un servicio"
              subtitulo="Selecciona la atención que deseas reservar"
            >
              <div className="grid grid-cols-1 gap-3">
                {servicios.map((s) => {
                  const seleccionado = s.id === servicioSeleccionadoId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        onCambiarServicio(s.id);
                        setPaso(2);
                      }}
                      className={`p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex justify-between items-center ${
                        seleccionado
                          ? "border-zinc-900 bg-zinc-50/80 ring-2 ring-zinc-900/10 shadow-xs"
                          : "border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-zinc-900 text-base">
                            {s.nombre}
                          </h4>
                          <span className="text-xs bg-zinc-100 text-zinc-600 font-medium px-2 py-0.5 rounded-md">
                            {s.duracionMin} min
                          </span>
                        </div>
                        {s.descripcion && (
                          <p className="text-xs text-zinc-500 mt-1 max-w-md">
                            {s.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-base font-extrabold text-zinc-900 font-mono">
                          ${(s.precioCentavos / 100).toFixed(2)}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ACCard>
          )}

          {/* PASO 2: Calendario y Horarios Disponibles */}
          {paso === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <ACCalendar
                fechaSeleccionada={fechaSeleccionada}
                onSeleccionarFecha={(f) => onCambiarFecha(f)}
                fechaMinima={fechaMinima}
              />

              <ACCard
                titulo="Horarios Disponibles"
                subtitulo={formatearFechaLegible(fechaSeleccionada)}
                className="p-5"
              >
                {slotsDisponibles.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400 italic">
                      No hay horarios libres para esta fecha. Elige otro día.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {slotsDisponibles.map((slot) => {
                        const esActivo = slot === slotSeleccionado;
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => {
                              setSlotSeleccionado(slot);
                              setPaso(3);
                            }}
                            className={`py-2.5 px-3 text-xs font-bold font-mono rounded-xl border text-center transition-all cursor-pointer ${
                              esActivo
                                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                                : "bg-white text-zinc-700 border-zinc-200/80 hover:border-zinc-400 hover:bg-zinc-50"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ACCard>
            </div>
          )}

          {/* PASO 3: Formulario de Contacto */}
          {paso === 3 && (
            <ACCard
              titulo="Tus Datos de Contacto"
              subtitulo="Completa la información para asegurar tu reservación"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <ACInput
                  etiqueta="Nombre Completo *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  icono={<User className="w-4 h-4" />}
                  placeholder="Ej. Juan Pérez"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ACInput
                    etiqueta="Correo Electrónico *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    icono={<Mail className="w-4 h-4" />}
                    placeholder="juan@ejemplo.com"
                  />
                  <ACInput
                    etiqueta="Teléfono (Opcional)"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    icono={<Phone className="w-4 h-4" />}
                    placeholder="662 123 4567"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <ACButton
                    type="button"
                    variante="fantasma"
                    onClick={() => setPaso(2)}
                  >
                    ← Cambiar horario
                  </ACButton>
                  <ACButton
                    type="submit"
                    cargando={cargando}
                    disabled={!nombre || !email || !slotSeleccionado}
                  >
                    Confirmar Reservación
                  </ACButton>
                </div>
              </form>
            </ACCard>
          )}
        </div>
      </div>
    </div>
  );
};
