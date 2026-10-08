import React from "react";

interface ACInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string;
  error?: string;
}

export const ACInput: React.FC<ACInputProps> = ({
  etiqueta,
  error,
  id,
  className = "",
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {etiqueta && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700 select-none"
        >
          {etiqueta}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-400 focus:border-red-500"
            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
};
