"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACInput, ACBadge } from "@/shared/ui";
import { NegocioConfig, ActualizarNegocioInput } from "../domain/entities";
import {
  Store,
  Globe,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface PerfilNegocioViewProps {
  negocio?: NegocioConfig | null;
  onGuardar: (datos: ActualizarNegocioInput) => Promise<void>;
  cargando?: boolean;
  error?: string;
  exito?: boolean;
}

export const PerfilNegocioView: React.FC<PerfilNegocioViewProps> = ({
  negocio,
  onGuardar,
  cargando = false,
  error,
  exito = false,
}) => {
  const [nombre, setNombre] = useState(negocio?.nombre || "");
  const [slug, setSlug] = useState(negocio?.slug || "");
  const [zonaHoraria, setZonaHoraria] = useState(
    negocio?.zonaHoraria || "America/Hermosillo"
  );
  const [copiado, setCopiado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar({ nombre, slug, zonaHoraria });
  };

  const handleCopiarEnlace = () => {
    const url = `https://agendacitas.app/${slug || "mi-negocio"}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Configuración de Negocio
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Gestiona el nombre de tu marca, el identificador único y tu enlace de reservas
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 border border-red-200/90 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {exito && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200/90 text-emerald-700 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>¡La información de tu negocio ha sido actualizada con éxito!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario (7 columnas) */}
        <div className="lg:col-span-7">
          <ACCard
            titulo="Datos Generales"
            subtitulo="Estos datos se muestran en el encabezado de tu agenda pública"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <ACInput
                etiqueta="Nombre del Negocio *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej. Barbería Clásica & Estilo"
                iconoIzquierda={<Store className="w-4 h-4 text-zinc-400" />}
              />

              <div>
                <ACInput
                  etiqueta="Identificador Web (Slug) *"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  required
                  placeholder="barberia-clasica"
                  iconoIzquierda={<LinkIcon className="w-4 h-4 text-zinc-400" />}
                />
                <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
                  <span>Solo letras minúsculas, números y guiones medios.</span>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Zona Horaria Principal *</span>
                </label>
                <select
                  value={zonaHoraria}
                  onChange={(e) => setZonaHoraria(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-2xs"
                >
                  <option value="America/Hermosillo">Hermosillo (GMT-7) • Sonora</option>
                  <option value="America/Mexico_City">Ciudad de México (GMT-6) • Centro</option>
                  <option value="America/Tijuana">Tijuana (GMT-8) • Baja California</option>
                  <option value="America/Bogota">Bogotá (GMT-5) • Colombia</option>
                  <option value="America/Buenos_Aires">Buenos Aires (GMT-3) • Argentina</option>
                  <option value="Europe/Madrid">Madrid (GMT+1) • España</option>
                </select>
                <p className="text-xs text-zinc-400">
                  Tus horarios de apertura se calcularán con base en esta zona horaria.
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end">
                <ACButton
                  type="submit"
                  cargando={cargando}
                  iconoIzquierda={<Save className="w-4 h-4" />}
                >
                  Guardar Información
                </ACButton>
              </div>
            </form>
          </ACCard>
        </div>

        {/* Tarjeta de Preview en Vivo del Enlace Público (5 columnas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
            {/* Adorno visual */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-800 rounded-full blur-2xl opacity-60 pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
                Tu Enlace de Reserva
              </span>
              <ACBadge variante="neutral" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                En Vivo
              </ACBadge>
            </div>

            {/* Simulación de Barra de Navegador */}
            <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-xl p-3 flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 overflow-hidden text-xs font-mono text-zinc-300">
                <span className="text-zinc-500 select-none">https://</span>
                <span className="truncate text-white font-semibold">
                  agendacitas.app/{slug || "tu-negocio"}
                </span>
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-white text-zinc-900 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                  {nombre ? nombre.slice(0, 2).toUpperCase() : "AG"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 line-clamp-1">
                    {nombre || "Nombre de tu Negocio"}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Zona: {zonaHoraria.split("/")[1]?.replace("_", " ") || zonaHoraria}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopiarEnlace}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors border border-zinc-700"
              >
                {copiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              <a
                href={`/${slug || "barberia-clasica"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                <span>Ver Página</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Tips card */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 text-xs text-zinc-500 space-y-1.5 shadow-2xs">
            <p className="font-bold text-zinc-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Consejo para tu enlace
            </p>
            <p>
              Comparte tu enlace en tu biografía de Instagram, perfil de WhatsApp Business o envíalo directamente por mensaje a tus clientes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
