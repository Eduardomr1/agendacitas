export type EstadoCita = "confirmada" | "cancelada" | "completada";

export interface CitaAdminItem {
  id: string;
  negocioId: string;
  servicioId: string;
  servicioNombre: string;
  duracionMin: number;
  precioCentavos: number;
  inicio: Date;
  fin: Date;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string | null;
  estado: EstadoCita;
}

export interface FiltroCitasInput {
  negocioId: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  estado?: EstadoCita;
}
