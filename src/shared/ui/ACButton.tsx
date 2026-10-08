import React from "react";

export type VarianteBoton = "primario" | "secundario" | "peligro" | "contorno" | "fantasma";

interface ACButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  cargando?: boolean;
  icono?: React.ReactNode;
  iconoIzquierda?: React.ReactNode;
  iconoDerecha?: React.ReactNode;
}

export const ACButton: React.FC<ACButtonProps> = ({
  children,
  variante = "primario",
  cargando = false,
  disabled,
  icono,
  iconoIzquierda,
  iconoDerecha,
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] px-4 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]";

  const variantes: Record<VarianteBoton, string> = {
    primario:
      "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 focus:ring-zinc-900",
    secundario:
      "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-400",
    peligro:
      "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus:ring-rose-500",
    contorno:
      "border border-zinc-200 bg-white text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 focus:ring-zinc-400",
    fantasma:
      "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:ring-zinc-300",
  };

  return (
    <button
      className={`${base} ${variantes[variante]} ${className}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Cargando...</span>
        </span>
      ) : (
        <>
          {(iconoIzquierda || icono) && (
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              {iconoIzquierda || icono}
            </span>
          )}
          {children}
          {iconoDerecha && (
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              {iconoDerecha}
            </span>
          )}
        </>
      )}
    </button>
  );
};
