export interface NegocioPublico {
  id: string;
  slug: string;
  nombre: string;
  zonaHoraria: string;
}

export interface ServicioPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracionMin: number;
  precioCentavos: number;
}

export interface CitaSolicitud {
  negocioId: string;
  servicioId: string;
  inicio: Date;
  fin: Date;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
}

export interface CitaResultado {
  id: string;
  inicio: Date;
  fin: Date;
  clienteNombre: string;
  clienteEmail: string;
  estado: string;
}
