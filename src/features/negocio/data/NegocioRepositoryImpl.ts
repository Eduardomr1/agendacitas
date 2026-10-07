import { db } from "@/db";
import { negocios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { INegocioRepository } from "../domain/repositories";
import { NegocioConfig, ActualizarNegocioInput } from "../domain/entities";
import { Failure, traducirErrorBaseDatos } from "@/shared/errors";

export class NegocioRepositoryImpl implements INegocioRepository {
  async obtenerPorOwner(
    ownerId: string
  ): Promise<{ data?: NegocioConfig | null; failure?: Failure }> {
    try {
      const [registro] = await db
        .select()
        .from(negocios)
        .where(eq(negocios.ownerId, ownerId))
        .limit(1);

      return { data: registro || null };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async crearOActualizar(
    ownerId: string,
    input: ActualizarNegocioInput
  ): Promise<{ data?: NegocioConfig; failure?: Failure }> {
    try {
      const [existente] = await db
        .select()
        .from(negocios)
        .where(eq(negocios.ownerId, ownerId))
        .limit(1);

      if (existente) {
        const [actualizado] = await db
          .update(negocios)
          .set({
            nombre: input.nombre,
            slug: input.slug,
            zonaHoraria: input.zonaHoraria,
          })
          .where(eq(negocios.id, existente.id))
          .returning();
        return { data: actualizado };
      } else {
        const [creado] = await db
          .insert(negocios)
          .values({
            ownerId,
            nombre: input.nombre,
            slug: input.slug,
            zonaHoraria: input.zonaHoraria,
          })
          .returning();
        return { data: creado };
      }
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }
}
