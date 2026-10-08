export interface ServicioItem {
  id: string;
  negocioId: string;
  nombre: string;
  descripcion: string | null;
  duracionMin: number;
  precioCentavos: number;
  activo: boolean;
}

export interface CrearServicioInput {
  negocioId: string;
  nombre: string;
  descripcion?: string;
  duracionMin: number;
  precioCentavos: number;
}

export interface HorarioLaboralItem {
  id: string;
  negocioId: string;
  diaSemana: number; // 0 = Domingo, 1 = Lunes, etc.
  abre: string; // "09:00"
  cierra: string; // "18:00"
  activo: boolean;
}

export interface GuardarHorariosInput {
  negocioId: string;
  horarios: {
    diaSemana: number;
    abre: string;
    cierra: string;
    activo: boolean;
  }[];
}
