"use client";

import { PerfilNegocioView } from "@/features/negocio";
import React from "react";

export default function PaginaConfiguracionNegocio() {
  const negocioDemo = {
    id: "neg-demo-1",
    ownerId: "usr-1",
    slug: "barberia-clasica",
    nombre: "Barbería Clásica & Estilo",
    zonaHoraria: "America/Hermosillo",
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <PerfilNegocioView
        negocio={negocioDemo}
        onGuardar={async (datos) => {
          console.log("Guardar negocio:", datos);
        }}
      />
    </main>
  );
}
