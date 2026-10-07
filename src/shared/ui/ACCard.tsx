import React from "react";

interface ACCardProps {
  children: React.ReactNode;
  titulo?: string;
  subtitulo?: string;
  className?: string;
}

export const ACCard: React.FC<ACCardProps> = ({
  children,
  titulo,
  subtitulo,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6 ${className}`}
    >
      {(titulo || subtitulo) && (
        <div className="mb-4">
          {titulo && (
            <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
          )}
          {subtitulo && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitulo}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
