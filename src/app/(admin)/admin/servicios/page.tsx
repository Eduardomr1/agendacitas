"use client";

import { GestionServiciosView, ServicioItem } from "@/features/servicios";
import React, { useState } from "react";

export default function PaginaGestionServicios() {
  const [servicios, setServicios] = useState<ServicioItem[]>([
    {
      id: "srv-1",
      negocioId: "neg-1",
      nombre: "Corte Tradicional",
      descripcion: "Corte con tijera y peinado",
      duracionMin: 30,
      precioCentavos: 25000,
      activo: true,
    },
    {
      id: "srv-2",
      negocioId: "neg-1",
      nombre: "Perfilado de Barba",
      descripcion: "Toalla caliente y navaja",
      duracionMin: 20,
      precioCentavos: 15000,
      activo: true,
    },
  ]);

  const [horarios, setHorarios] = useState([
    { id: "h-1", negocioId: "neg-1", diaSemana: 1, abre: "09:00", cierra: "19:00", activo: true },
    { id: "h-2", negocioId: "neg-1", diaSemana: 2, abre: "09:00", cierra: "19:00", activo: true },
    { id: "h-3", negocioId: "neg-1", diaSemana: 3, abre: "09:00", cierra: "19:00", activo: true },
    { id: "h-4", negocioId: "neg-1", diaSemana: 4, abre: "09:00", cierra: "19:00", activo: true },
    { id: "h-5", negocioId: "neg-1", diaSemana: 5, abre: "09:00", cierra: "19:00", activo: true },
    { id: "h-6", negocioId: "neg-1", diaSemana: 6, abre: "10:00", cierra: "16:00", activo: true },
    { id: "h-0", negocioId: "neg-1", diaSemana: 0, abre: "09:00", cierra: "18:00", activo: false },
  ]);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <GestionServiciosView
        servicios={servicios}
        horarios={horarios}
        onCrearServicio={async (input) => {
          const nuevo = {
            id: `srv-${Date.now()}`,
            negocioId: "neg-1",
            nombre: input.nombre,
            descripcion: input.descripcion || null,
            duracionMin: input.duracionMin,
            precioCentavos: input.precioCentavos,
            activo: true,
          };
          setServicios([...servicios, nuevo]);
        }}
        onAlternarEstadoServicio={async (id, activo) => {
          setServicios(
            servicios.map((s) => (s.id === id ? { ...s, activo } : s))
          );
        }}
        onEliminarServicio={async (id) => {
          setServicios(servicios.filter((s) => s.id !== id));
        }}
        onGuardarHorarios={async (nuevosHorarios) => {
          setHorarios(
            nuevosHorarios.map((h, i) => ({
              id: `h-${i}`,
              negocioId: "neg-1",
              ...h,
            }))
          );
          alert("Horarios guardados correctamente");
        }}
      />
    </main>
  );
}
