import {
  ServicioItem,
  CrearServicioInput,
  HorarioLaboralItem,
  GuardarHorariosInput,
} from "./entities";
import { Failure } from "@/shared/errors";

export interface IServiciosRepository {
  listarServicios(negocioId: string): Promise<{ data?: ServicioItem[]; failure?: Failure }>;
  crearServicio(input: CrearServicioInput): Promise<{ data?: ServicioItem; failure?: Failure }>;
  cambiarEstadoServicio(id: string, activo: boolean): Promise<{ failure?: Failure }>;
  eliminarServicio(id: string): Promise<{ failure?: Failure }>;

  obtenerHorarios(negocioId: string): Promise<{ data?: HorarioLaboralItem[]; failure?: Failure }>;
  guardarHorarios(input: GuardarHorariosInput): Promise<{ failure?: Failure }>;
}
