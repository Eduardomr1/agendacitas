import { db } from "@/db";
import { negocios, servicios, citas, horarios } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { IReservasRepository } from "../domain/repositories";
import {
  NegocioPublico,
  ServicioPublico,
  CitaSolicitud,
  CitaResultado,
} from "../domain/entities";
import { Failure, traducirErrorBaseDatos, crearFailure } from "@/shared/errors";
import {
  calcularHorariosDisponibles,
  horaAMinutos,
} from "@/lib/disponibilidad";

export class ReservasRepositoryImpl implements IReservasRepository {
  async obtenerNegocioPorSlug(
    slug: string
  ): Promise<{ data?: NegocioPublico; failure?: Failure }> {
    try {
      const [resultado] = await db
        .select({
          id: negocios.id,
          slug: negocios.slug,
          nombre: negocios.nombre,
          zonaHoraria: negocios.zonaHoraria,
        })
        .from(negocios)
        .where(eq(negocios.slug, slug))
        .limit(1);

      if (!resultado) {
        return {
          failure: crearFailure(
            "RECURSO_NO_ENCONTRADO",
            "El negocio especificado no existe o no está disponible."
          ),
        };
      }

      return { data: resultado };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async obtenerServiciosActivos(
    negocioId: string
  ): Promise<{ data?: ServicioPublico[]; failure?: Failure }> {
    try {
      const items = await db
        .select({
          id: servicios.id,
          nombre: servicios.nombre,
          descripcion: servicios.descripcion,
          duracionMin: servicios.duracionMin,
          precioCentavos: servicios.precioCentavos,
        })
        .from(servicios)
        .where(
          and(eq(servicios.negocioId, negocioId), eq(servicios.activo, true))
        );

      return { data: items };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async obtenerSlotsDisponibles(
    negocioId: string,
    fecha: string, // YYYY-MM-DD
    servicioId: string
  ): Promise<{ data?: string[]; failure?: Failure }> {
    try {
      // 1. Obtener datos del servicio para saber duración
      const [servicio] = await db
        .select()
        .from(servicios)
        .where(eq(servicios.id, servicioId))
        .limit(1);

      if (!servicio) {
        return {
          failure: crearFailure(
            "RECURSO_NO_ENCONTRADO",
            "El servicio seleccionado no existe."
          ),
        };
      }

      // 2. Determinar día de la semana (0 = Domingo, 1 = Lunes...)
      const fechaObj = new Date(`${fecha}T00:00:00`);
      const diaSemana = fechaObj.getDay();

      // 3. Buscar horario de apertura para ese día
      const [horario] = await db
        .select()
        .from(horarios)
        .where(
          and(
            eq(horarios.negocioId, negocioId),
            eq(horarios.diaSemana, diaSemana),
            eq(horarios.activo, true)
          )
        )
        .limit(1);

      if (!horario) {
        return { data: [] }; // Negocio cerrado ese día
      }

      // 4. Buscar citas existentes en esa fecha
      const inicioDia = new Date(`${fecha}T00:00:00Z`);
      const finDia = new Date(`${fecha}T23:59:59Z`);

      const citasDelDia = await db
        .select()
        .from(citas)
        .where(
          and(
            eq(citas.negocioId, negocioId),
            gte(citas.inicio, inicioDia),
            lte(citas.fin, finDia),
            eq(citas.estado, "confirmada")
          )
        );

      const citasMinutos = citasDelDia.map((c) => ({
        inicioMin: c.inicio.getUTCHours() * 60 + c.inicio.getUTCMinutes(),
        finMin: c.fin.getUTCHours() * 60 + c.fin.getUTCMinutes(),
      }));

      // 5. Calcular slots disponibles usando el motor puro
      const slots = calcularHorariosDisponibles(
        {
          inicioMin: horaAMinutos(horario.abre),
          finMin: horaAMinutos(horario.cierra),
        },
        citasMinutos,
        servicio.duracionMin,
        30
      );

      return { data: slots };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }

  async crearCita(
    solicitud: CitaSolicitud
  ): Promise<{ data?: CitaResultado; failure?: Failure }> {
    try {
      // Inserción en Postgres
      const [nuevaCita] = await db
        .insert(citas)
        .values({
          negocioId: solicitud.negocioId,
          servicioId: solicitud.servicioId,
          inicio: solicitud.inicio,
          fin: solicitud.fin,
          clienteNombre: solicitud.clienteNombre,
          clienteEmail: solicitud.clienteEmail,
          clienteTelefono: solicitud.clienteTelefono,
          estado: "confirmada",
        })
        .returning();

      return {
        data: {
          id: nuevaCita.id,
          inicio: nuevaCita.inicio,
          fin: nuevaCita.fin,
          clienteNombre: nuevaCita.clienteNombre,
          clienteEmail: nuevaCita.clienteEmail,
          estado: nuevaCita.estado,
        },
      };
    } catch (error) {
      return { failure: traducirErrorBaseDatos(error) };
    }
  }
}
