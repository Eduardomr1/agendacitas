"use client";

import React, { useState } from "react";
import { ACCard, ACButton, ACInput } from "@/shared/ui";
import { NegocioConfig, ActualizarNegocioInput } from "../domain/entities";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar({ nombre, slug, zonaHoraria });
  };

  return (
    <div className="max-w-xl mx-auto my-10 px-4">
      <ACCard
        titulo="Configuración de tu Negocio"
        subtitulo="Define cómo verán tus clientes tu página pública de reservas"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {exito && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            ¡Información actualizada con éxito!
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ACInput
            etiqueta="Nombre del Negocio *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej. Barbería Clásica & Estilo"
          />

          <div>
            <ACInput
              etiqueta="Enlace Público (Slug) *"
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
            />
            <p className="text-xs text-gray-500 mt-1">
              Tu enlace público será: <strong>agendacitas.app/{slug || "tu-negocio"}</strong>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Zona Horaria
            </label>
            <select
              value={zonaHoraria}
              onChange={(e) => setZonaHoraria(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/Hermosillo">Hermosillo (GMT-7)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/Tijuana">Tijuana (GMT-8)</option>
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
            </select>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <ACButton type="submit" cargando={cargando}>
              Guardar Cambios
            </ACButton>
          </div>
        </form>
      </ACCard>
    </div>
  );
};
