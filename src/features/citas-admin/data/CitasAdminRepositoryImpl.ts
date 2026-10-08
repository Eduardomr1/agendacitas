import { db } from "@/db";
import { citas, servicios } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { ICitasAdminRepository } from "../domain/repositories";
import { CitaAdminItem, FiltroCitasInput, EstadoCita } from "../domain/entities";
import { Failure, traducirErrorBaseDatos } from "@/shared/errors";

export class CitasAdminRepositoryImpl implements ICitasAdminRepository {
  async listarCitas(
    filtro: FiltroCitasInput
  ): Promise<{ data?: CitaAdminItem[]; failure?: Failure }> {
    try {
      const condiciones = [eq(citas.negocioId, filtro.negocioId)];

      if (filtro.estado) {
        condiciones.push(eq(citas.estado, filtro.estado));
      }
      if (filtro.fechaInicio) {
        condiciones.push(gte(citas.inicio, filtro.fechaInicio));
      }
      if (filtro.fechaFin) {
        condiciones.push(lte(citas.fin, filtro.fechaFin));
      }

      const resultados = await db
        .select({
          id: citas.id,
          negocioId: citas.negocioId,
          servicioId: citas.servicioId,
          servicioNombre: servicios.nombre,
          duracionMin: servicios.duracionMin,
          precioCentavos: servicios.precioCentavos,
          inicio: citas.inicio,
          fin: citas.fin,
          clienteNombre: citas.clienteNombre,
          clienteEmail: citas.clienteEmail,
          clienteTelefono: citas.clienteTelefono,
          estado: citas.estado,
        })
        .from(citas)
        .innerJoin(servicios, eq(citas.servicioId, servicios.id))
        .where(and(...condiciones))
        .orderBy(desc(citas.inicio));

      const formateadas: CitaAdminItem[] = resultados.map((r) => ({
        ...r,
        estado: r.estado as EstadoCita,
      }));

      return { data: formateadas };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async actualizarEstadoCita(
    id: string,
    nuevoEstado: EstadoCita
  ): Promise<{ failure?: Failure }> {
    try {
      await db
        .update(citas)
        .set({ estado: nuevoEstado })
        .where(eq(citas.id, id));

      return {};
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }
}
