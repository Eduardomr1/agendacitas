import React from "react";

interface ACCardProps {
  children: React.ReactNode;
  titulo?: string;
  subtitulo?: string;
  className?: string;
  accionEncabezado?: React.ReactNode;
}

export const ACCard: React.FC<ACCardProps> = ({
  children,
  titulo,
  subtitulo,
  className = "",
  accionEncabezado,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 md:p-8 transition-all duration-150 ${className}`}
    >
      {(titulo || subtitulo || accionEncabezado) && (
        <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-zinc-100">
          <div>
            {titulo && (
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
                {titulo}
              </h3>
            )}
            {subtitulo && (
              <p className="text-sm text-zinc-500 mt-1">{subtitulo}</p>
            )}
          </div>
          {accionEncabezado && <div>{accionEncabezado}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
