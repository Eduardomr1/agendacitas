import { NegocioConfig, ActualizarNegocioInput } from "./entities";
import { Failure } from "@/shared/errors";

export interface INegocioRepository {
  obtenerPorOwner(ownerId: string): Promise<{ data?: NegocioConfig | null; failure?: Failure }>;
  crearOActualizar(ownerId: string, input: ActualizarNegocioInput): Promise<{ data?: NegocioConfig; failure?: Failure }>;
}
