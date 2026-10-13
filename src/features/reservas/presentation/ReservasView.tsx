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
import { ConfirmacionReserva } from "./components/ConfirmacionReserva";

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
  codigoConfirmacion?: string;
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
  codigoConfirmacion,
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

  // PANTALLA DE ÉXITO (Ticket de Reserva Confirmada con Integración de Calendario)
  if (exito) {
    const servicioParaConfirmar =
      servicioActivo ||
      servicios.find((s) => s.id === servicioSeleccionadoId) ||
      servicios[0] || {
        id: servicioSeleccionadoId || "default",
        nombre: "Servicio Seleccionado",
        descripcion: null,
        duracionMin: 30,
        precioCentavos: 0,
      };

    return (
      <ConfirmacionReserva
        negocio={negocio}
        servicio={servicioParaConfirmar}
        fecha={fechaSeleccionada}
        slot={slotSeleccionado}
        cliente={{
          nombre,
          email,
          telefono,
          notas,
        }}
        codigoConfirmacion={codigoConfirmacion}
        onNuevaReserva={() => {
          setPaso(1);
          setSlotSeleccionado("");
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />
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
