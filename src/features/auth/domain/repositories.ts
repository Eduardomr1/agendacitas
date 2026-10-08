import { UsuarioAuth, CredencialesLogin } from "./entities";
import { Failure } from "@/shared/errors";

export interface IAuthRepository {
  iniciarSesion(credenciales: CredencialesLogin): Promise<{ data?: UsuarioAuth; failure?: Failure }>;
  registrarse(credenciales: CredencialesLogin): Promise<{ data?: UsuarioAuth; failure?: Failure }>;
  cerrarSesion(): Promise<{ failure?: Failure }>;
  obtenerUsuarioActual(): Promise<{ data?: UsuarioAuth | null; failure?: Failure }>;
}
