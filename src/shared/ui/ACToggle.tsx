"use client";

import React from "react";

export interface ACToggleProps {
  activo: boolean;
  onChange: (activo: boolean) => void;
  etiqueta?: string;
  descripcion?: string;
  deshabilitado?: boolean;
  className?: string;
}

export const ACToggle: React.FC<ACToggleProps> = ({
  activo,
  onChange,
  etiqueta,
  descripcion,
  deshabilitado = false,
  className = "",
}) => {
  return (
    <label
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${
        deshabilitado ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        disabled={deshabilitado}
        onClick={() => !deshabilitado && onChange(!activo)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
          activo ? "bg-zinc-900" : "bg-zinc-200"
        } ${deshabilitado ? "cursor-not-allowed" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            activo ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>

      {(etiqueta || descripcion) && (
        <div className="flex flex-col">
          {etiqueta && (
            <span
              className={`text-sm font-medium transition-colors ${
                activo ? "text-zinc-900" : "text-zinc-500"
              }`}
            >
              {etiqueta}
            </span>
          )}
          {descripcion && (
            <span className="text-xs text-zinc-400">{descripcion}</span>
          )}
        </div>
      )}
    </label>
  );
};
