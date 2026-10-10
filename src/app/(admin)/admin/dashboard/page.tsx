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
      inicio: new Date(2026, 9, 9, 10, 0), // Viernes 9 oct, 10:00 AM
      fin: new Date(2026, 9, 9, 10, 30),
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
      inicio: new Date(2026, 9, 9, 12, 0), // Viernes 9 oct, 12:00 PM
      fin: new Date(2026, 9, 9, 12, 20),
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
      inicio: new Date(2026, 9, 8, 16, 0), // Jueves 8 oct, 4:00 PM
      fin: new Date(2026, 9, 8, 16, 30),
      clienteNombre: "Carlos Mendoza", // Cliente recurrente
      clienteEmail: "carlos@ejemplo.com",
      clienteTelefono: "662 555 1234",
      estado: "completada",
    },
    {
      id: "c-104",
      negocioId: "neg-1",
      servicioId: "srv-3",
      servicioNombre: "Corte + Barba Premium",
      duracionMin: 50,
      precioCentavos: 38000,
      inicio: new Date(2026, 9, 10, 11, 0), // Sábado 10 oct, 11:00 AM
      fin: new Date(2026, 9, 10, 11, 50),
      clienteNombre: "Eduardo López",
      clienteEmail: "eduardo.lopez@ejemplo.com",
      clienteTelefono: "662 888 4321",
      estado: "confirmada",
    },
    {
      id: "c-105",
      negocioId: "neg-1",
      servicioId: "srv-1",
      servicioNombre: "Corte Tradicional",
      duracionMin: 30,
      precioCentavos: 25000,
      inicio: new Date(2026, 9, 7, 9, 0), // Miércoles 7 oct, 9:00 AM
      fin: new Date(2026, 9, 7, 9, 30),
      clienteNombre: "Mario Soto",
      clienteEmail: "mario@ejemplo.com",
      clienteTelefono: "662 111 2233",
      estado: "completada",
    },
    {
      id: "c-106",
      negocioId: "neg-1",
      servicioId: "srv-2",
      servicioNombre: "Perfilado de Barba",
      duracionMin: 20,
      precioCentavos: 15000,
      inicio: new Date(2026, 9, 9, 15, 0), // Viernes 9 oct, 3:00 PM
      fin: new Date(2026, 9, 9, 15, 20),
      clienteNombre: "Roberto Garza",
      clienteEmail: "roberto@ejemplo.com",
      clienteTelefono: "662 999 1122",
      estado: "cancelada",
    },
  ]);

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoCita) => {
    setCitas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))
    );
  };

  return (
    <main className="py-2">
      <DashboardCitasView
        citas={citas}
        onCambiarEstado={handleCambiarEstado}
      />
    </main>
  );
}
