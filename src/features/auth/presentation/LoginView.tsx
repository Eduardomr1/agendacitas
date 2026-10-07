"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACInput } from "@/shared/ui";

interface LoginViewProps {
  onIniciarSesion: (email: string, pass: string) => Promise<void>;
  onRegistrarse: (email: string, pass: string) => Promise<void>;
  cargando?: boolean;
  error?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onIniciarSesion,
  onRegistrarse,
  cargando = false,
  error,
}) => {
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (esRegistro) {
      await onRegistrarse(email, password);
    } else {
      await onIniciarSesion(email, password);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <ACCard>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {esRegistro ? "Crear Cuenta de Negocio" : "Acceso Administrativo"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {esRegistro
              ? "Configura tu agenda y recibe citas hoy mismo"
              : "Ingresa con tu correo para administrar tu agenda"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ACInput
            etiqueta="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@tunegocio.com"
          />

          <ACInput
            etiqueta="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
          />

          <ACButton type="submit" cargando={cargando} className="w-full mt-2">
            {esRegistro ? "Registrarme" : "Iniciar Sesión"}
          </ACButton>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => setEsRegistro(!esRegistro)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {esRegistro
              ? "¿Ya tienes cuenta? Inicia sesión aquí"
              : "¿Aún no tienes cuenta? Regístrate gratis"}
          </button>
        </div>
      </ACCard>
    </div>
  );
};
