"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACInput, ACBadge } from "@/shared/ui";
import {
  CalendarCheck2,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

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
    <div className="max-w-md w-full mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CalendarCheck2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {esRegistro ? "Crea tu Cuenta de Negocio" : "Acceso Administrativo"}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {esRegistro
            ? "Comienza a recibir citas y gestionar tu disponibilidad hoy"
            : "Ingresa tus credenciales para acceder a tu panel de control"}
        </p>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50/80 border border-red-200/90 text-red-700 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <ACInput
            etiqueta="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@tunegocio.com"
            iconoIzquierda={<Mail className="w-4 h-4 text-zinc-400" />}
          />

          <ACInput
            etiqueta="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            iconoIzquierda={<Lock className="w-4 h-4 text-zinc-400" />}
          />

          <div className="pt-2">
            <ACButton
              type="submit"
              cargando={cargando}
              iconoDerecha={<ArrowRight className="w-4 h-4" />}
              className="w-full"
            >
              {esRegistro ? "Crear Cuenta Gratis" : "Iniciar Sesión"}
            </ACButton>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
          <button
            type="button"
            onClick={() => setEsRegistro(!esRegistro)}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            {esRegistro
              ? "¿Ya tienes cuenta registrada? Inicia sesión aquí"
              : "¿Aún no tienes cuenta? Regístrate gratis en 1 minuto"}
          </button>
        </div>
      </div>
    </div>
  );
};
