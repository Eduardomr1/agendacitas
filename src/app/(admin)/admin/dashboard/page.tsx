"use client";

import { DashboardCitasView, CitaAdminItem, EstadoCita } from "@/features/citas-admin";
import React, { useState } from "react";

export default function PaginaDashboardCitas() {
  const [citas, setCitas] = useState<CitaAdminItem[]>([
    {
      id: "c-101",
      negocioId: "neg-1",
      servicioId: "srv-1",
      servicioNombre: "Corte Tradicional",
      duracionMin: 30,
      precioCentavos: 25000,
      inicio: new Date("2026-10-15T10:00:00Z"),
      fin: new Date("2026-10-15T10:30:00Z"),
      clienteNombre: "Carlos Mendoza",
      clienteEmail: "carlos@ejemplo.com",
      clienteTelefono: "662 555 1234",
      estado: "confirmada",
    },
    {
      id: "c-102",
      negocioId: "neg-1",
      servicioId: "srv-2",
      servicioNombre: "Perfilado de Barba",
      duracionMin: 20,
      precioCentavos: 15000,
      inicio: new Date("2026-10-15T11:00:00Z"),
      fin: new Date("2026-10-15T11:20:00Z"),
      clienteNombre: "Alejandro Ruiz",
      clienteEmail: "alejandro@ejemplo.com",
      clienteTelefono: "662 777 9876",
      estado: "confirmada",
    },
    {
      id: "c-103",
      negocioId: "neg-1",
      servicioId: "srv-1",
      servicioNombre: "Corte Tradicional",
      duracionMin: 30,
      precioCentavos: 25000,
      inicio: new Date("2026-10-14T16:00:00Z"),
      fin: new Date("2026-10-14T16:30:00Z"),
      clienteNombre: "Mario Soto",
      clienteEmail: "mario@ejemplo.com",
      clienteTelefono: null,
      estado: "completada",
    },
  ]);

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoCita) => {
    setCitas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <DashboardCitasView
        citas={citas}
        onCambiarEstado={handleCambiarEstado}
      />
    </main>
  );
}
