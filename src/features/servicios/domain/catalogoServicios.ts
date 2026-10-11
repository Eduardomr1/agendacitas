import { ServicioItem } from "./entities";

export interface ValidacionServicioResultado {
  valido: boolean;
  errores: {
    nombre?: string;
    duracionMin?: string;
    precioCentavos?: string;
    categoria?: string;
  };
}

/**
 * Valida de forma exhaustiva los campos de un servicio antes de enviarlo
 */
export function validarServicioPayload(datos: {
  nombre?: string;
  duracionMin?: number;
  precioCentavos?: number;
  categoria?: string;
}): ValidacionServicioResultado {
  const errores: ValidacionServicioResultado["errores"] = {};

  if (!datos.nombre || !datos.nombre.trim()) {
    errores.nombre = "El nombre del servicio es obligatorio.";
  } else if (datos.nombre.trim().length < 2) {
    errores.nombre = "El nombre debe contener al menos 2 caracteres.";
  }

  if (datos.duracionMin === undefined || datos.duracionMin === null || isNaN(datos.duracionMin)) {
    errores.duracionMin = "La duración en minutos es requerida.";
  } else if (datos.duracionMin <= 0) {
    errores.duracionMin = "La duración debe ser mayor a 0 minutos.";
  } else if (datos.duracionMin > 480) {
    errores.duracionMin = "La duración máxima permitida es de 480 minutos (8 horas).";
  }

  if (datos.precioCentavos === undefined || datos.precioCentavos === null || isNaN(datos.precioCentavos)) {
    errores.precioCentavos = "El precio es requerido.";
  } else if (datos.precioCentavos < 0) {
    errores.precioCentavos = "El precio no puede ser negativo.";
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Convierte un monto en pesos a centavos redondeado
 */
export function pesosACentavos(pesos: number): number {
  if (isNaN(pesos)) return 0;
  return Math.round(pesos * 100);
}

/**
 * Convierte centavos a pesos decimales
 */
export function centavosAPesos(centavos: number): number {
  if (!centavos || isNaN(centavos)) return 0;
  return centavos / 100;
}

/**
 * Formatea un valor en centavos a moneda legible ($ 250.00 MXN)
 */
export function formatearPrecioPesos(precioCentavos: number): string {
  const pesos = centavosAPesos(precioCentavos);
  return `$${pesos.toFixed(2)}`;
}

/**
 * Extrae las categorías únicas existentes en una lista de servicios
 */
export function obtenerCategoriasDisponibles(servicios: ServicioItem[]): string[] {
  const conjunto = new Set<string>();
  for (const s of servicios) {
    if (s.categoria && s.categoria.trim()) {
      conjunto.add(s.categoria.trim());
    }
  }
  return Array.from(conjunto).sort((a, b) => a.localeCompare(b));
}

/**
 * Filtra servicios por categoría y/o término de búsqueda en texto
 */
export function filtrarServicios(
  servicios: ServicioItem[],
  filtro: {
    categoria?: string | null;
    busqueda?: string;
  }
): ServicioItem[] {
  return servicios.filter((s) => {
    // Filtro por categoría
    if (filtro.categoria && filtro.categoria !== "todas") {
      if (!s.categoria || s.categoria.toLowerCase() !== filtro.categoria.toLowerCase()) {
        return false;
      }
    }

    // Filtro por término de búsqueda
    if (filtro.busqueda && filtro.busqueda.trim()) {
      const termino = filtro.busqueda.trim().toLowerCase();
      const coincideNombre = s.nombre.toLowerCase().includes(termino);
      const coincideDescripcion = s.descripcion?.toLowerCase().includes(termino);
      const coincideCategoria = s.categoria?.toLowerCase().includes(termino);
      if (!coincideNombre && !coincideDescripcion && !coincideCategoria) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calcula un resumen estadístico del catálogo de servicios
 */
export function calcularResumenCatalogo(servicios: ServicioItem[]): {
  totalServicios: number;
  activos: number;
  pausados: number;
  precioPromedioCentavos: number;
  duracionPromedioMin: number;
} {
  const totalServicios = servicios.length;
  if (totalServicios === 0) {
    return {
      totalServicios: 0,
      activos: 0,
      pausados: 0,
      precioPromedioCentavos: 0,
      duracionPromedioMin: 0,
    };
  }

  const activos = servicios.filter((s) => s.activo).length;
  const pausados = totalServicios - activos;

  const sumaPrecios = servicios.reduce((acc, s) => acc + s.precioCentavos, 0);
  const sumaDuracion = servicios.reduce((acc, s) => acc + s.duracionMin, 0);

  return {
    totalServicios,
    activos,
    pausados,
    precioPromedioCentavos: Math.round(sumaPrecios / totalServicios),
    duracionPromedioMin: Math.round(sumaDuracion / totalServicios),
  };
}
