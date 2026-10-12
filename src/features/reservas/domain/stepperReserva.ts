export type PasoReserva = 1 | 2 | 3;

export type EstadoPaso = "completado" | "activo" | "pendiente" | "bloqueado";

export interface DefinicionPaso {
  numero: PasoReserva;
  titulo: string;
  subtitulo: string;
}

export const PASOS_RESERVA: readonly DefinicionPaso[] = [
  {
    numero: 1,
    titulo: "Servicio",
    subtitulo: "Elige la atención",
  },
  {
    numero: 2,
    titulo: "Fecha y Horario",
    subtitulo: "Selecciona el momento",
  },
  {
    numero: 3,
    titulo: "Tus Datos",
    subtitulo: "Información de contacto",
  },
] as const;

export interface DatosPaso1 {
  servicioId?: string;
}

export interface DatosPaso2 {
  fecha?: string;
  slot?: string;
}

export interface DatosPaso3 {
  nombre: string;
  email: string;
  telefono?: string;
  notas?: string;
}

export interface EstadoCompletoStepper {
  pasoActual: PasoReserva;
  paso1: DatosPaso1;
  paso2: DatosPaso2;
  paso3: DatosPaso3;
}

export interface ResultadoValidacionPaso1 {
  esValido: boolean;
  error?: string;
}

export interface ResultadoValidacionPaso2 {
  esValido: boolean;
  errores: {
    fecha?: string;
    slot?: string;
  };
}

export interface ResultadoValidacionPaso3 {
  esValido: boolean;
  errores: {
    nombre?: string;
    email?: string;
    telefono?: string;
    notas?: string;
  };
}

/**
 * Valida el Paso 1 (Selección de Servicio)
 */
export function validarPaso1(datos: DatosPaso1): ResultadoValidacionPaso1 {
  if (!datos.servicioId || datos.servicioId.trim() === "") {
    return {
      esValido: false,
      error: "Debes seleccionar un servicio para continuar.",
    };
  }

  return { esValido: true };
}

/**
 * Valida el Paso 2 (Fecha y Slot de horario disponible)
 */
export function validarPaso2(datos: DatosPaso2): ResultadoValidacionPaso2 {
  const errores: ResultadoValidacionPaso2["errores"] = {};

  if (!datos.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.fecha = "Selecciona una fecha válida.";
  }

  if (!datos.slot || !/^\d{1,2}:\d{2}$/.test(datos.slot.trim())) {
    errores.slot = "Selecciona un horario disponible.";
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
  };
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida el Paso 3 (Datos de contacto del cliente)
 */
export function validarPaso3(datos: DatosPaso3): ResultadoValidacionPaso3 {
  const errores: ResultadoValidacionPaso3["errores"] = {};

  const nombreLimpio = datos.nombre ? datos.nombre.trim() : "";
  if (!nombreLimpio) {
    errores.nombre = "El nombre completo es obligatorio.";
  } else if (nombreLimpio.length < 2) {
    errores.nombre = "El nombre debe tener al menos 2 caracteres.";
  }

  const emailLimpio = datos.email ? datos.email.trim() : "";
  if (!emailLimpio) {
    errores.email = "El correo electrónico es obligatorio.";
  } else if (!REGEX_EMAIL.test(emailLimpio)) {
    errores.email = "Ingresa un correo electrónico válido.";
  }

  if (datos.telefono && datos.telefono.trim().length > 0) {
    const telLimpio = datos.telefono.trim();
    if (!/^[0-9+\s\-()]{7,20}$/.test(telLimpio)) {
      errores.telefono = "Ingresa un número telefónico válido (mínimo 7 dígitos).";
    }
  }

  if (datos.notas && datos.notas.trim().length > 500) {
    errores.notas = "Las notas no pueden superar los 500 caracteres.";
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Evalúa si se permite navegar hacia un paso específico
 */
export function puedeNavegarAPaso(
  pasoDestino: PasoReserva,
  estado: EstadoCompletoStepper
): boolean {
  // Navegación hacia atrás siempre permitida
  if (pasoDestino <= estado.pasoActual) {
    return true;
  }

  if (pasoDestino === 2) {
    return validarPaso1(estado.paso1).esValido;
  }

  if (pasoDestino === 3) {
    const paso1Ok = validarPaso1(estado.paso1).esValido;
    const paso2Ok = validarPaso2(estado.paso2).esValido;
    return paso1Ok && paso2Ok;
  }

  return false;
}

/**
 * Determina el estado semántico de un paso para accesibilidad y estilo
 */
export function determinarEstadoPaso(
  pasoNumero: PasoReserva,
  pasoActual: PasoReserva,
  estado: EstadoCompletoStepper
): EstadoPaso {
  if (pasoNumero === pasoActual) {
    return "activo";
  }

  if (pasoNumero === 1) {
    return validarPaso1(estado.paso1).esValido ? "completado" : "pendiente";
  }

  if (pasoNumero === 2) {
    if (validarPaso2(estado.paso2).esValido && pasoActual > 2) {
      return "completado";
    }
    if (validarPaso1(estado.paso1).esValido) {
      return "pendiente";
    }
    return "bloqueado";
  }

  if (pasoNumero === 3) {
    if (validarPaso3(estado.paso3).esValido && pasoActual === 3) {
      return "activo";
    }
    const puedeAcceder =
      validarPaso1(estado.paso1).esValido && validarPaso2(estado.paso2).esValido;
    return puedeAcceder ? "pendiente" : "bloqueado";
  }

  return "pendiente";
}

/**
 * Calcula el porcentaje de avance para la barra visual de progreso
 */
export function calcularProgresoPorcentaje(pasoActual: PasoReserva): number {
  switch (pasoActual) {
    case 1:
      return 33;
    case 2:
      return 66;
    case 3:
      return 100;
    default:
      return 0;
  }
}

/**
 * Formatea precio en centavos a formato de moneda legible
 */
export function formatearPrecio(precioCentavos: number): string {
  const precio = (precioCentavos || 0) / 100;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(precio);
}

/**
 * Formatea fecha ISO (YYYY-MM-DD) a texto descriptivo en español
 */
export function formatearFechaLegible(fechaISO: string): string {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return "";
  const [y, m, d] = fechaISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
