"use client";

import { ReservasView } from "@/features/reservas";
import React from "react";

// Datos de demostración de un negocio para renderizado de la página pública
export default function PaginaReservaPublica() {
  const negocioDemo = {
    id: "neg-demo-1",
    slug: "barberia-clasica",
    nombre: "Barbería Clásica & Estilo",
    zonaHoraria: "America/Hermosillo",
  };

  const serviciosDemo = [
    {
      id: "srv-1",
      nombre: "Corte de Cabello Tradicional",
      descripcion: "Lavado, corte personalizado con tijera y navaja, y peinado.",
      duracionMin: 30,
      precioCentavos: 25000,
    },
    {
      id: "srv-2",
      nombre: "Arreglo y Perfilado de Barba",
      descripcion: "Toalla caliente, aceite de hidratación y perfilado al ras.",
      duracionMin: 30,
      precioCentavos: 18000,
    },
    {
      id: "srv-3",
      nombre: "Servicio Completo (Corte + Barba)",
      descripcion: "Experiencia completa de corte y cuidado de barba.",
      duracionMin: 60,
      precioCentavos: 40000,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <ReservasView
        negocio={negocioDemo}
        servicios={serviciosDemo}
        slotsDisponibles={["10:00", "10:30", "11:00", "11:30", "16:00", "16:30", "17:00"]}
        fechaSeleccionada="2026-10-15"
        servicioSeleccionadoId="srv-1"
        onCambiarFecha={() => {}}
        onCambiarServicio={() => {}}
        onConfirmarReserva={async () => {}}
      />
    </main>
  );
}
