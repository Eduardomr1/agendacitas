import { NegocioPublico, ServicioPublico, CitaSolicitud, CitaResultado } from "./entities";
import { Failure } from "@/shared/errors";

export interface IReservasRepository {
  obtenerNegocioPorSlug(slug: string): Promise<{ data?: NegocioPublico; failure?: Failure }>;
  obtenerServiciosActivos(negocioId: string): Promise<{ data?: ServicioPublico[]; failure?: Failure }>;
  obtenerSlotsDisponibles(
    negocioId: string,
    fecha: string, // YYYY-MM-DD
    servicioId: string
  ): Promise<{ data?: string[]; failure?: Failure }>;
  crearCita(solicitud: CitaSolicitud): Promise<{ data?: CitaResultado; failure?: Failure }>;
}
