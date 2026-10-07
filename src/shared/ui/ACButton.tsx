import React from "react";

interface ACButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "peligro" | "contorno";
  cargando?: boolean;
}

export const ACButton: React.FC<ACButtonProps> = ({
  children,
  variante = "primario",
  cargando = false,
  disabled,
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed";

  const variantes = {
    primario: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secundario: "bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-700",
    peligro: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    contorno:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
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
        children
      )}
    </button>
  );
};
