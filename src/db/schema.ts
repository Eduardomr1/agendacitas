import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const negocios = pgTable("negocios", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  zonaHoraria: text("zona_horaria").default("America/Hermosillo").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const servicios = pgTable("servicios", {
  id: uuid("id").defaultRandom().primaryKey(),
  negocioId: uuid("negocio_id")
    .references(() => negocios.id, { onDelete: "cascade" })
    .notNull(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  duracionMin: integer("duracion_min").notNull(),
  precioCentavos: integer("precio_centavos").notNull(),
  activo: boolean("activo").default(true).notNull(),
});

export const horarios = pgTable("horarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  negocioId: uuid("negocio_id")
    .references(() => negocios.id, { onDelete: "cascade" })
    .notNull(),
  diaSemana: integer("dia_semana").notNull(), // 0 = Domingo, 1 = Lunes, etc.
  abre: text("abre").notNull(), // "09:00"
  cierra: text("cierra").notNull(), // "18:00"
  activo: boolean("activo").default(true).notNull(),
});

export const citas = pgTable("citas", {
  id: uuid("id").defaultRandom().primaryKey(),
  negocioId: uuid("negocio_id")
    .references(() => negocios.id, { onDelete: "cascade" })
    .notNull(),
  servicioId: uuid("servicio_id")
    .references(() => servicios.id)
    .notNull(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fin: timestamp("fin", { withTimezone: true }).notNull(),
  clienteNombre: text("cliente_nombre").notNull(),
  clienteEmail: text("cliente_email").notNull(),
  clienteTelefono: text("cliente_telefono"),
  estado: text("estado").default("confirmada").notNull(), // confirmada, cancelada, completada
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});
