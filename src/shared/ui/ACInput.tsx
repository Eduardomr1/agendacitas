import React from "react";

interface ACInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string;
  error?: string;
  icono?: React.ReactNode;
  iconoIzquierda?: React.ReactNode;
}

export const ACInput: React.FC<ACInputProps> = ({
  etiqueta,
  error,
  icono,
  iconoIzquierda,
  id,
  className = "",
  ...props
}) => {
  const inputId = id || props.name;
  const iconoActivo = iconoIzquierda || icono;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {etiqueta && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-600 select-none"
        >
          {etiqueta}
        </label>
      )}
      <div className="relative flex items-center">
        {iconoActivo && (
          <span className="absolute left-3.5 text-zinc-400 pointer-events-none w-4 h-4 flex items-center justify-center">
            {iconoActivo}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full min-h-[44px] ${
            iconoActivo ? "pl-10" : "px-3.5"
          } pr-3.5 py-2.5 rounded-xl border text-sm transition-all duration-150 focus:outline-none focus:ring-2 placeholder:text-zinc-400 ${
            error
              ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20"
              : "border-zinc-200/90 hover:border-zinc-300 focus:ring-zinc-900/10 focus:border-zinc-900 bg-white"
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-rose-600 font-medium mt-0.5">{error}</span>}
    </div>
  );
};
