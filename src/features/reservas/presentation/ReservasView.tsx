"use client";

import React, { useState } from "react";
import { NegocioPublico, ServicioPublico } from "../domain/entities";
import { ACCard, ACButton, ACBadge } from "@/shared/ui";
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  MapPin,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import {
  PasoReserva,
  EstadoCompletoStepper,
  formatearFechaLegible,
  formatearPrecio,
} from "../domain/stepperReserva";
import { BookingStepperNav } from "./components/BookingStepperNav";
import { PasoServicios } from "./components/PasoServicios";
import { PasoFechaHorario } from "./components/PasoFechaHorario";
import { PasoContacto } from "./components/PasoContacto";

export interface ConfirmarReservaDatos {
  slot: string;
  nombre: string;
  email: string;
  telefono: string;
  notas?: string;
}

export interface ReservasViewProps {
  negocio: NegocioPublico;
  servicios: ServicioPublico[];
  slotsDisponibles: string[];
  fechaSeleccionada: string;
  servicioSeleccionadoId?: string;
  onCambiarFecha: (fecha: string) => void;
  onCambiarServicio: (servicioId: string) => void;
  onConfirmarReserva: (datos: ConfirmarReservaDatos) => Promise<void>;
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
  const [paso, setPaso] = useState<PasoReserva>(1);
  const [slotSeleccionado, setSlotSeleccionado] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");

  const [fechaMinima, setFechaMinima] = useState<string>("");

  React.useEffect(() => {
    setFechaMinima(new Date().toISOString().split("T")[0]);
  }, []);

  const servicioActivo = servicios.find((s) => s.id === servicioSeleccionadoId);

  // Estado completo del stepper para reglas de dominio y navegación
  const estadoStepper: EstadoCompletoStepper = {
    pasoActual: paso,
    paso1: { servicioId: servicioSeleccionadoId },
    paso2: { fecha: fechaSeleccionada, slot: slotSeleccionado },
    paso3: { nombre, email, telefono, notas },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSeleccionado || !nombre.trim() || !email.trim()) return;

    await onConfirmarReserva({
      slot: slotSeleccionado,
      nombre,
      email,
      telefono,
      notas,
    });
  };

  // PANTALLA DE ÉXITO (Ticket de Reserva Confirmada)
  if (exito) {
    return (
      <div className="max-w-xl mx-auto my-8 sm:my-12 px-4">
        <ACCard className="text-center p-6 sm:p-10 relative overflow-hidden">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <ACBadge variante="exito" className="mb-3">
            Confirmada
          </ACBadge>

          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">
            ¡Tu cita ha sido reservada!
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
            Hemos registrado tu reservación en <strong>{negocio.nombre}</strong>.
            Enviamos los detalles de tu cita a <strong>{email}</strong>.
          </p>

          {/* Tarjeta tipo Pase / Ticket de Cita */}
          <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-5 text-left mb-6 space-y-4">
            <div className="flex justify-between items-start border-b border-zinc-200/70 pb-3">
              <div>
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  Servicio
                </span>
                <p className="text-base font-bold text-zinc-900 mt-0.5">
                  {servicioActivo?.nombre}
                </p>
              </div>
              <span className="text-sm font-extrabold text-zinc-900 bg-white px-3 py-1 rounded-lg border border-zinc-200 font-mono">
                {formatearPrecio(servicioActivo?.precioCentavos || 0)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  Fecha
                </span>
                <p className="text-sm font-semibold text-zinc-800 capitalize mt-0.5">
                  {formatearFechaLegible(fechaSeleccionada)}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  Horario
                </span>
                <p className="text-sm font-semibold text-zinc-800 mt-0.5">
                  {slotSeleccionado} ({servicioActivo?.duracionMin} min)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Cliente
                </span>
                <span className="font-semibold text-zinc-900">{nombre}</span>
              </div>
              {telefono && (
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Teléfono
                  </span>
                  <span>{telefono}</span>
                </div>
              )}
            </div>

            {notas && (
              <div className="pt-3 border-t border-zinc-200/60 text-xs text-zinc-600">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                  Notas
                </span>
                <p className="italic text-zinc-700 bg-white p-2.5 rounded-lg border border-zinc-200/70">
                  {notas}
                </p>
              </div>
            )}
          </div>

          <ACButton
            onClick={() => {
              setPaso(1);
              setSlotSeleccionado("");
              window.location.reload();
            }}
            variante="primario"
            iconoIzquierda={<RotateCcw className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Reservar otra cita
          </ACButton>
        </ACCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto my-6 sm:my-8 px-4">
      {/* Alerta de error si ocurre */}
      {error && (
        <div
          role="alert"
          className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium flex items-center justify-between"
        >
          <span>{error}</span>
        </div>
      )}

      {/* Grid Principal Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Información del Negocio y Resumen Dinámico */}
        <aside className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
          <ACCard className="p-6">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                {negocio.nombre.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 tracking-tight leading-snug">
                  {negocio.nombre}
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{negocio.zonaHoraria}</span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-zinc-100 flex items-center gap-2">
              <ACBadge
                variante="exito"
                icono={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Verificado
              </ACBadge>
              <span className="text-xs text-zinc-400">
                Reserva instantánea
              </span>
            </div>

            {/* Resumen dinámico en vivo de la reservación */}
            <div className="mt-5 pt-5 border-t border-zinc-100 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Resumen de la cita
              </span>

              {servicioActivo ? (
                <div className="space-y-3 bg-zinc-50/90 rounded-xl p-4 border border-zinc-200/80">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-bold text-zinc-900">
                      {servicioActivo.nombre}
                    </span>
                    <span className="text-sm font-extrabold text-zinc-900 font-mono">
                      {formatearPrecio(servicioActivo.precioCentavos)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {servicioActivo.duracionMin} min
                    </span>
                    {slotSeleccionado && (
                      <span className="flex items-center gap-1 font-semibold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-200">
                        <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                        {slotSeleccionado}
                      </span>
                    )}
                  </div>

                  {fechaSeleccionada && (
                    <p className="text-xs text-zinc-600 capitalize pt-2 border-t border-zinc-200/60 font-medium">
                      {formatearFechaLegible(fechaSeleccionada)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-zinc-200 rounded-xl">
                  <Sparkles className="w-5 h-5 text-zinc-300 mx-auto mb-1.5" />
                  <p className="text-xs text-zinc-400">
                    Selecciona un servicio para comenzar
                  </p>
                </div>
              )}
            </div>
          </ACCard>
        </aside>

        {/* Columna Derecha: Stepper interactivo y pasos */}
        <main className="lg:col-span-8 flex flex-col">
          {/* Navegación y progreso del Stepper */}
          <BookingStepperNav
            pasoActual={paso}
            estado={estadoStepper}
            onCambiarPaso={(nuevoPaso) => setPaso(nuevoPaso)}
          />

          {/* PASO 1: Selección de Servicio */}
          {paso === 1 && (
            <PasoServicios
              servicios={servicios}
              servicioSeleccionadoId={servicioSeleccionadoId}
              onSeleccionarServicio={(id) => onCambiarServicio(id)}
              onContinuar={() => setPaso(2)}
            />
          )}

          {/* PASO 2: Selección de Fecha y Slot Horario */}
          {paso === 2 && (
            <PasoFechaHorario
              fechaSeleccionada={fechaSeleccionada}
              slotSeleccionado={slotSeleccionado}
              slotsDisponibles={slotsDisponibles}
              fechaMinima={fechaMinima}
              duracionMin={servicioActivo?.duracionMin}
              zonaHoraria={negocio.zonaHoraria}
              onSeleccionarFecha={(f) => onCambiarFecha(f)}
              onSeleccionarSlot={(slot) => setSlotSeleccionado(slot)}
              onAtras={() => setPaso(1)}
              onContinuar={() => setPaso(3)}
            />
          )}

          {/* PASO 3: Formulario de Datos de Contacto */}
          {paso === 3 && (
            <PasoContacto
              negocio={negocio}
              servicio={servicioActivo}
              fecha={fechaSeleccionada}
              slot={slotSeleccionado}
              nombre={nombre}
              email={email}
              telefono={telefono}
              notas={notas}
              cargando={cargando}
              onCambiarNombre={setNombre}
              onCambiarEmail={setEmail}
              onCambiarTelefono={setTelefono}
              onCambiarNotas={setNotas}
              onAtras={() => setPaso(2)}
              onSubmit={handleSubmit}
            />
          )}
        </main>
      </div>
    </div>
  );
};
