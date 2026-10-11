"use client";

import { GestionServiciosView, ServicioItem } from "@/features/servicios";
import React, { useState } from "react";

export default function PaginaGestionServicios() {
  const [servicios, setServicios] = useState<ServicioItem[]>([
    {
      id: "srv-1",
      negocioId: "neg-1",
      nombre: "Corte Tradicional & Peinado",
      descripcion: "Corte con tijera, navaja y lavado con tónico refrescante",
      duracionMin: 35,
      precioCentavos: 25000,
      categoria: "Cortes",
      activo: true,
    },
    {
      id: "srv-2",
      negocioId: "neg-1",
      nombre: "Perfilado de Barba y Toalla Caliente",
      descripcion: "Ritual completo con bálsamo hidratante y aceite para barba",
      duracionMin: 25,
      precioCentavos: 18000,
      categoria: "Barba",
      activo: true,
    },
    {
      id: "srv-3",
      negocioId: "neg-1",
      nombre: "Combo Completo: Corte & Barba",
      descripcion: "Servicio premium con masaje capilar y tratamiento de toalla",
      duracionMin: 60,
      precioCentavos: 38000,
      categoria: "Cortes",
      activo: true,
    },
    {
      id: "srv-4",
      negocioId: "neg-1",
      nombre: "Tratamiento Facial Exfoliante",
      descripcion: "Limpieza profunda con mascarilla de arcilla negra",
      duracionMin: 45,
      precioCentavos: 32000,
      categoria: "Tratamientos",
      activo: false, // Inicia pausado para demostrar badge de Pausado
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
    <main className="py-2">
      <GestionServiciosView
        servicios={servicios}
        horarios={horarios}
        onCrearServicio={async (input) => {
          const nuevo: ServicioItem = {
            id: `srv-${Date.now()}`,
            negocioId: "neg-1",
            nombre: input.nombre,
            descripcion: input.descripcion || null,
            duracionMin: input.duracionMin,
            precioCentavos: input.precioCentavos,
            categoria: input.categoria || null,
            activo: true,
          };
          setServicios((prev) => [...prev, nuevo]);
        }}
        onActualizarServicio={async (input) => {
          setServicios((prev) =>
            prev.map((s) => {
              if (s.id !== input.id) return s;
              return {
                ...s,
                nombre: input.nombre !== undefined ? input.nombre : s.nombre,
                descripcion: input.descripcion !== undefined ? input.descripcion : s.descripcion,
                duracionMin: input.duracionMin !== undefined ? input.duracionMin : s.duracionMin,
                precioCentavos: input.precioCentavos !== undefined ? input.precioCentavos : s.precioCentavos,
                categoria: input.categoria !== undefined ? input.categoria : s.categoria,
                activo: input.activo !== undefined ? input.activo : s.activo,
              };
            })
          );
        }}
        onAlternarEstadoServicio={async (id, activo) => {
          setServicios((prev) =>
            prev.map((s) => (s.id === id ? { ...s, activo } : s))
          );
        }}
        onEliminarServicio={async (id) => {
          setServicios((prev) => prev.filter((s) => s.id !== id));
        }}
        onGuardarHorarios={async (nuevosHorarios) => {
          setHorarios(
            nuevosHorarios.map((h, i) => ({
              id: `h-${i}`,
              negocioId: "neg-1",
              ...h,
            }))
          );
        }}
      />
    </main>
  );
}
