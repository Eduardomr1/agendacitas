"use client";

import React, { useState, useEffect } from "react";
import { ServicioItem } from "../domain/entities";
import { ACButton, ACInput } from "@/shared/ui";
import {
  X,
  Layers,
  Clock,
  DollarSign,
  Tag,
  FileText,
  Save,
  Plus,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export interface DatosServicioModal {
  id?: string;
  nombre: string;
  descripcion?: string;
  duracionMin: number;
  precioCentavos: number;
  categoria?: string;
}

export interface ServicioModalProps {
  abierto: boolean;
  servicioParaEditar?: ServicioItem | null;
  onCerrar: () => void;
  onGuardar: (datos: DatosServicioModal) => Promise<void>;
  cargando?: boolean;
}

const CATEGORIAS_SUGERIDAS = [
  "Cortes",
  "Barba",
  "Tratamientos",
  "Colorimetría",
  "Estética",
  "General",
];

const DURACIONES_SUGERIDAS = [15, 30, 45, 60, 90, 120];

export const ServicioModal: React.FC<ServicioModalProps> = ({
  abierto,
  servicioParaEditar,
  onCerrar,
  onGuardar,
  cargando = false,
}) => {
  const esEdicion = Boolean(servicioParaEditar);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [duracionMin, setDuracionMin] = useState<number>(30);
  const [precioPesos, setPrecioPesos] = useState<number>(250);
  const [descripcion, setDescripcion] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Sincronizar formulario al abrir o cambiar de servicio
  useEffect(() => {
    if (servicioParaEditar) {
      setNombre(servicioParaEditar.nombre);
      setCategoria(servicioParaEditar.categoria || "");
      setDuracionMin(servicioParaEditar.duracionMin);
      setPrecioPesos(servicioParaEditar.precioCentavos / 100);
      setDescripcion(servicioParaEditar.descripcion || "");
    } else {
      setNombre("");
      setCategoria("");
      setDuracionMin(30);
      setPrecioPesos(250);
      setDescripcion("");
    }
    setErrores({});
  }, [servicioParaEditar, abierto]);

  // Manejo de tecla ESC para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && abierto && !cargando) {
        onCerrar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abierto, cargando, onCerrar]);

  if (!abierto) return null;

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = "El nombre del servicio es obligatorio.";
    } else if (nombre.trim().length < 2) {
      nuevosErrores.nombre = "El nombre debe contener al menos 2 caracteres.";
    }

    if (!duracionMin || isNaN(duracionMin) || duracionMin <= 0) {
      nuevosErrores.duracionMin = "La duración debe ser mayor a 0 minutos.";
    } else if (duracionMin > 480) {
      nuevosErrores.duracionMin = "La duración máxima permitida es 480 minutos (8 horas).";
    }

    if (precioPesos === undefined || isNaN(precioPesos) || precioPesos < 0) {
      nuevosErrores.precioPesos = "El precio no puede ser negativo.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const precioCentavos = Math.round(Number(precioPesos) * 100);

    await onGuardar({
      id: servicioParaEditar?.id,
      nombre: nombre.trim(),
      categoria: categoria.trim() || undefined,
      duracionMin: Number(duracionMin),
      precioCentavos,
      descripcion: descripcion.trim() || undefined,
    });

    onCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onCerrar();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-servicio-titulo"
    >
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              {esEdicion ? <Layers className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h3 id="modal-servicio-titulo" className="text-base font-bold text-zinc-900">
                {esEdicion ? "Editar Servicio" : "Nuevo Servicio"}
              </h3>
              <p className="text-xs text-zinc-500">
                {esEdicion
                  ? "Modifica las especificaciones y valores de este servicio"
                  : "Registra una nueva opción reservable para tus clientes"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
            {/* Nombre del servicio */}
            <div>
              <ACInput
                etiqueta="Nombre del servicio *"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (errores.nombre) setErrores({ ...errores, nombre: "" });
                }}
                required
                placeholder="Ej. Corte Tradicional & Barba"
                iconoIzquierda={<Layers className="w-4 h-4 text-zinc-400" />}
              />
              {errores.nombre && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errores.nombre}
                </p>
              )}
            </div>

            {/* Categoría con sugerencias */}
            <div>
              <ACInput
                etiqueta="Categoría (Opcional)"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej. Barbería, Facial, Estética..."
                iconoIzquierda={<Tag className="w-4 h-4 text-zinc-400" />}
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-zinc-400 font-medium mr-1">Sugerencias:</span>
                {CATEGORIAS_SUGERIDAS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                      categoria.toLowerCase() === cat.toLowerCase()
                        ? "bg-zinc-900 text-white border-zinc-900 font-semibold"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Duración y Precio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <ACInput
                  etiqueta="Duración (Minutos) *"
                  type="number"
                  value={duracionMin}
                  onChange={(e) => {
                    setDuracionMin(Number(e.target.value));
                    if (errores.duracionMin) setErrores({ ...errores, duracionMin: "" });
                  }}
                  required
                  min={5}
                  max={480}
                  step={5}
                  iconoIzquierda={<Clock className="w-4 h-4 text-zinc-400" />}
                />
                {errores.duracionMin && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errores.duracionMin}
                  </p>
                )}
                {/* Sugerencias de duración */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {DURACIONES_SUGERIDAS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuracionMin(d)}
                      className={`text-[10px] px-1.5 py-0.2 rounded border transition-colors ${
                        duracionMin === d
                          ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                          : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <ACInput
                  etiqueta="Precio ($ MXN) *"
                  type="number"
                  value={precioPesos}
                  onChange={(e) => {
                    setPrecioPesos(Number(e.target.value));
                    if (errores.precioPesos) setErrores({ ...errores, precioPesos: "" });
                  }}
                  required
                  min={0}
                  step={10}
                  iconoIzquierda={<DollarSign className="w-4 h-4 text-zinc-400" />}
                />
                {errores.precioPesos && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {errores.precioPesos}
                  </p>
                )}
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  Equivale a <strong className="text-zinc-700">{Math.round((precioPesos || 0) * 100).toLocaleString("es-MX")}</strong> centavos
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
                Descripción (Opcional)
              </label>
              <div className="relative">
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalla qué incluye el servicio, beneficios o consideraciones..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pie del modal con acciones */}
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
            <ACButton
              type="button"
              variante="secundario"
              onClick={onCerrar}
              disabled={cargando}
              className="text-xs"
            >
              Cancelar
            </ACButton>

            <ACButton
              type="submit"
              variante="primario"
              cargando={cargando}
              iconoIzquierda={esEdicion ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              className="text-xs"
            >
              {esEdicion ? "Guardar Cambios" : "Crear Servicio"}
            </ACButton>
          </div>
        </form>
      </div>
    </div>
  );
};
