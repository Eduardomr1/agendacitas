"use client";

import React, { useState } from "react";
import { NegocioPublico, ServicioPublico } from "../domain/entities";
import { ACCard, ACButton, ACInput } from "@/shared/ui";

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
  const [slotSeleccionado, setSlotSeleccionado] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [fechaMinima, setFechaMinima] = useState<string>("");

  React.useEffect(() => {
    setFechaMinima(new Date().toISOString().split("T")[0]);
  }, []);

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

  if (exito) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <ACCard className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Cita Reservada con Éxito!
          </h2>
          <p className="text-gray-600 mb-6">
            Te hemos enviado un correo de confirmación a <strong>{email}</strong>{" "}
            con todos los detalles de tu cita en {negocio.nombre}.
          </p>
          <ACButton
            onClick={() => window.location.reload()}
            variante="primario"
          >
            Reservar otra cita
          </ACButton>
        </ACCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-8 px-4">
      {/* Encabezado del Negocio */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          {negocio.nombre}
        </h1>
        <p className="text-gray-500 mt-1">Agenda tu cita en línea fácilmente</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Paso 1: Seleccionar Servicio */}
        <ACCard titulo="1. Selecciona un Servicio">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {servicios.map((s) => {
              const seleccionado = s.id === servicioSeleccionadoId;
              return (
                <div
                  key={s.id}
                  onClick={() => onCambiarServicio(s.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    seleccionado
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-900">
                      {s.nombre}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      ${(s.precioCentavos / 100).toFixed(2)}
                    </span>
                  </div>
                  {s.descripcion && (
                    <p className="text-xs text-gray-500 mt-1">
                      {s.descripcion}
                    </p>
                  )}
                  <span className="inline-block mt-3 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {s.duracionMin} min
                  </span>
                </div>
              );
            })}
          </div>
        </ACCard>

        {/* Paso 2: Seleccionar Fecha y Hora */}
        {servicioSeleccionadoId && (
          <ACCard titulo="2. Selecciona Fecha y Horario">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => onCambiarFecha(e.target.value)}
                min={fechaMinima}
                className="w-full sm:w-64 min-h-[44px] px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Horarios Disponibles
              </label>
              {slotsDisponibles.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-2">
                  No hay horarios disponibles para esta fecha. Intenta con otro día.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {slotsDisponibles.map((slot) => {
                    const esActivo = slot === slotSeleccionado;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSlotSeleccionado(slot)}
                        className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-colors ${
                          esActivo
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ACCard>
        )}

        {/* Paso 3: Tus Datos */}
        {slotSeleccionado && (
          <ACCard titulo="3. Tus Datos de Contacto">
            <div className="flex flex-col gap-4">
              <ACInput
                etiqueta="Nombre Completo *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej. Juan Pérez"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ACInput
                  etiqueta="Correo Electrónico *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="juan@ejemplo.com"
                />
                <ACInput
                  etiqueta="Teléfono (Opcional)"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="662 123 4567"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <ACButton
                  type="submit"
                  cargando={cargando}
                  disabled={!nombre || !email || !slotSeleccionado}
                >
                  Confirmar Reservación
                </ACButton>
              </div>
            </div>
          </ACCard>
        )}
      </form>
    </div>
  );
};
