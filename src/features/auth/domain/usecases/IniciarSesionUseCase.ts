import { IAuthRepository } from "../repositories";
import { CredencialesLogin, UsuarioAuth } from "../entities";
import { Failure, crearFailure } from "@/shared/errors";

export class IniciarSesionUseCase {
  constructor(private repository: IAuthRepository) {}

  async execute(credenciales: CredencialesLogin): Promise<{ data?: UsuarioAuth; failure?: Failure }> {
    if (!credenciales.email.trim() || !credenciales.email.includes("@")) {
      return { failure: crearFailure("DATOS_INVALIDOS", "Por favor ingresa un correo electrónico válido.") };
    }

    if (!credenciales.password || credenciales.password.length < 6) {
      return { failure: crearFailure("DATOS_INVALIDOS", "La contraseña debe tener al menos 6 caracteres.") };
    }

    return this.repository.iniciarSesion(credenciales);
  }
}
