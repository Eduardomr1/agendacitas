import { supabase } from "@/shared/lib/supabase";
import { IAuthRepository } from "../domain/repositories";
import { CredencialesLogin, UsuarioAuth } from "../domain/entities";
import { Failure, crearFailure, traducirErrorBaseDatos } from "@/shared/errors";

export class AuthRepositoryImpl implements IAuthRepository {
  async iniciarSesion(
    credenciales: CredencialesLogin
  ): Promise<{ data?: UsuarioAuth; failure?: Failure }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credenciales.email,
        password: credenciales.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          return {
            failure: crearFailure(
              "DATOS_INVALIDOS",
              "El correo electrónico o la contraseña son incorrectos."
            ),
          };
        }
        return { failure: traducirErrorBaseDatos(error) };
      }

      if (!data.user) {
        return {
          failure: crearFailure(
            "SERVIDOR_NO_DISPONIBLE",
            "No se pudo recuperar la información de la sesión."
          ),
        };
      }

      return {
        data: {
          id: data.user.id,
          email: data.user.email || credenciales.email,
        },
      };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async registrarse(
    credenciales: CredencialesLogin
  ): Promise<{ data?: UsuarioAuth; failure?: Failure }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credenciales.email,
        password: credenciales.password,
      });

      if (error) {
        return { failure: traducirErrorBaseDatos(error) };
      }

      if (!data.user) {
        return {
          failure: crearFailure(
            "SERVIDOR_NO_DISPONIBLE",
            "No se pudo completar el registro de la cuenta."
          ),
        };
      }

      return {
        data: {
          id: data.user.id,
          email: data.user.email || credenciales.email,
        },
      };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async cerrarSesion(): Promise<{ failure?: Failure }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { failure: traducirErrorBaseDatos(error) };
      }
      return {};
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async obtenerUsuarioActual(): Promise<{
    data?: UsuarioAuth | null;
    failure?: Failure;
  }> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return { failure: traducirErrorBaseDatos(error) };
      }

      if (!data.user) {
        return { data: null };
      }

      return {
        data: {
          id: data.user.id,
          email: data.user.email || "",
        },
      };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }
}
