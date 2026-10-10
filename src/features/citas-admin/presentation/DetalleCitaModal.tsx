"use client";

import React from "react";
import { CitaAdminItem, EstadoCita } from "../domain/entities";
import { ACButton, ACBadge } from "@/shared/ui";
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface DetalleCitaModalProps {
  cita: CitaAdminItem | null;
  onCerrar: () => void;
  onCambiarEstado: (id: string, nuevoEstado: EstadoCita) => Promise<void>;
}

export const DetalleCitaModal: React.FC<DetalleCitaModalProps> = ({
  cita,
  onCerrar,
  onCambiarEstado,
}) => {
  if (!cita) return null;

  const fechaInicio = new Date(cita.inicio);
  const fechaFin = new Date(cita.fin);

  const formatearFecha = (d: Date) => {
    return d.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatearHora = (d: Date) => {
    return d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 id="modal-titulo" className="text-base font-bold text-zinc-900">
                Detalle de la Cita
              </h3>
              <p className="text-xs text-zinc-500">ID: {cita.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido con información */}
        <div className="p-6 space-y-5">
          {/* Badge de estado e información de tiempo */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Estado actual
            </span>
            <div>
              {cita.estado === "confirmada" && <ACBadge variante="exito">Confirmada</ACBadge>}
              {cita.estado === "completada" && <ACBadge variante="neutral">Completada</ACBadge>}
              {cita.estado === "cancelada" && <ACBadge variante="peligro">Cancelada</ACBadge>}
            </div>
          </div>

          {/* Horario y Fecha */}
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200/70 space-y-2">
            <div className="flex items-center gap-2 text-zinc-800 text-sm font-semibold capitalize">
              <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{formatearFecha(fechaInicio)}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600 text-xs">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>
                {formatearHora(fechaInicio)} – {formatearHora(fechaFin)} ({cita.duracionMin} minutos)
              </span>
            </div>
          </div>

          {/* Tarjeta de Servicio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-zinc-400" /> Servicio
              </span>
              <p className="text-sm font-bold text-zinc-900">{cita.servicioNombre}</p>
            </div>
            <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-zinc-400" /> Precio
              </span>
              <p className="text-sm font-bold text-zinc-900">
                ${(cita.precioCentavos / 100).toFixed(2)} MXN
              </p>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="border border-zinc-200/80 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Información de Contacto
            </span>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
              <User className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{cita.clienteNombre}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-600">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{cita.clienteEmail}</span>
            </div>
            {cita.clienteTelefono && (
              <div className="flex items-center gap-2.5 text-xs text-zinc-600">
                <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{cita.clienteTelefono}</span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Estado en el pie del modal */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-3">
          <ACButton
            type="button"
            variante="secundario"
            onClick={onCerrar}
            className="text-xs"
          >
            Cerrar
          </ACButton>

          <div className="flex items-center gap-2">
            {cita.estado === "confirmada" && (
              <>
                <ACButton
                  type="button"
                  variante="fantasma"
                  iconoIzquierda={<XCircle className="w-4 h-4 text-rose-500" />}
                  onClick={async () => {
                    await onCambiarEstado(cita.id, "cancelada");
                    onCerrar();
                  }}
                  className="text-xs text-zinc-600 hover:text-rose-600 hover:bg-rose-50"
                >
                  Cancelar Cita
                </ACButton>
                <ACButton
                  type="button"
                  variante="primario"
                  iconoIzquierda={<CheckCircle2 className="w-4 h-4 text-white" />}
                  onClick={async () => {
                    await onCambiarEstado(cita.id, "completada");
                    onCerrar();
                  }}
                  className="text-xs"
                >
                  Marcar Completada
                </ACButton>
              </>
            )}

            {cita.estado === "cancelada" && (
              <ACButton
                type="button"
                variante="primario"
                iconoIzquierda={<RotateCcw className="w-4 h-4 text-white" />}
                onClick={async () => {
                  await onCambiarEstado(cita.id, "confirmada");
                  onCerrar();
                }}
                className="text-xs"
              >
                Reactivar Cita
              </ACButton>
            )}

            {cita.estado === "completada" && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cita concluida
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
