import { db } from "@/db";
import { servicios, horarios } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { IServiciosRepository } from "../domain/repositories";
import {
  ServicioItem,
  CrearServicioInput,
  HorarioLaboralItem,
  GuardarHorariosInput,
} from "../domain/entities";
import { Failure, traducirErrorBaseDatos } from "@/shared/errors";

export class ServiciosRepositoryImpl implements IServiciosRepository {
  async listarServicios(
    negocioId: string
  ): Promise<{ data?: ServicioItem[]; failure?: Failure }> {
    try {
      const items = await db
        .select()
        .from(servicios)
        .where(eq(servicios.negocioId, negocioId));

      return { data: items };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async crearServicio(
    input: CrearServicioInput
  ): Promise<{ data?: ServicioItem; failure?: Failure }> {
    try {
      const [nuevo] = await db
        .insert(servicios)
        .values({
          negocioId: input.negocioId,
          nombre: input.nombre,
          descripcion: input.descripcion || null,
          duracionMin: input.duracionMin,
          precioCentavos: input.precioCentavos,
          activo: true,
        })
        .returning();

      return { data: nuevo };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async cambiarEstadoServicio(
    id: string,
    activo: boolean
  ): Promise<{ failure?: Failure }> {
    try {
      await db
        .update(servicios)
        .set({ activo })
        .where(eq(servicios.id, id));
      return {};
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async eliminarServicio(id: string): Promise<{ failure?: Failure }> {
    try {
      await db.delete(servicios).where(eq(servicios.id, id));
      return {};
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async obtenerHorarios(
    negocioId: string
  ): Promise<{ data?: HorarioLaboralItem[]; failure?: Failure }> {
    try {
      const items = await db
        .select()
        .from(horarios)
        .where(eq(horarios.negocioId, negocioId));

      return { data: items };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async guardarHorarios(
    input: GuardarHorariosInput
  ): Promise<{ failure?: Failure }> {
    try {
      // Reemplazo atómico de horarios para la semana
      await db
        .delete(horarios)
        .where(eq(horarios.negocioId, input.negocioId));

      if (input.horarios.length > 0) {
        await db.insert(horarios).values(
          input.horarios.map((h) => ({
            negocioId: input.negocioId,
            diaSemana: h.diaSemana,
            abre: h.abre,
            cierra: h.cierra,
            activo: h.activo,
          }))
        );
      }

      return {};
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }
}
