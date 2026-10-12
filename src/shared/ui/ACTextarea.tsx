import React from "react";

interface ACTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta?: string;
  error?: string;
  ayuda?: string;
}

export const ACTextarea: React.FC<ACTextareaProps> = ({
  etiqueta,
  error,
  ayuda,
  id,
  className = "",
  rows = 3,
  ...props
}) => {
  const textareaId = id || props.name;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {etiqueta && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-600 select-none"
        >
          {etiqueta}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-zinc-900 font-medium bg-white transition-all duration-150 focus:outline-none focus:ring-2 placeholder:text-zinc-400 resize-none ${
          error
            ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20"
            : "border-zinc-200/90 hover:border-zinc-300 focus:ring-zinc-900/10 focus:border-zinc-900"
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-rose-600 font-medium mt-0.5">{error}</span>
      )}
      {ayuda && !error && (
        <span className="text-xs text-zinc-400">{ayuda}</span>
      )}
    </div>
  );
};
