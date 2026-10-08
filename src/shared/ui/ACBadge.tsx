import React from "react";

export type VarianteBadge = "exito" | "advertencia" | "peligro" | "neutral" | "primario";

interface ACBadgeProps {
  children: React.ReactNode;
  variante?: VarianteBadge;
  className?: string;
  icono?: React.ReactNode;
}

export const ACBadge: React.FC<ACBadgeProps> = ({
  children,
  variante = "neutral",
  className = "",
  icono,
}) => {
  const base =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-colors";

  const variantes: Record<VarianteBadge, string> = {
    exito:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    advertencia:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    peligro:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    neutral:
      "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-500/10",
    primario:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  };

  return (
    <span className={`${base} ${variantes[variante]} ${className}`}>
      {icono && <span className="w-3.5 h-3.5 flex items-center justify-center">{icono}</span>}
      {children}
    </span>
  );
};
