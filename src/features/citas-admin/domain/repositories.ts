import { CitaAdminItem, FiltroCitasInput, EstadoCita } from "./entities";
import { Failure } from "@/shared/errors";

export interface ICitasAdminRepository {
  listarCitas(filtro: FiltroCitasInput): Promise<{ data?: CitaAdminItem[]; failure?: Failure }>;
  actualizarEstadoCita(id: string, nuevoEstado: EstadoCita): Promise<{ failure?: Failure }>;
}
