import { describe, expect, it } from "vitest";
import {
  MotorAsignacionEspecialistas,
  type Especialista,
} from "./asignacionEspecialistas";
import {
  MotorRecursosFisicos,
  intervalosConBufferSeSolapan,
  type RecursoFisico,
} from "./recursosFisicos";

describe("recursosFisicos - contención física con múltiples especialistas libres", () => {
  const especialistas: Especialista[] = [
    {
      id: "esp-ana",
      nombre: "Dra. Ana",
      activo: true,
      serviciosHabilitados: ["depilacion-laser"],
      citasAgendadas: [
        { inicio: "2026-11-25T10:00:00", fin: "2026-11-25T11:00:00" },
      ],
    },
    {
      id: "esp-bruno",
      nombre: "Dr. Bruno",
      activo: true,
      serviciosHabilitados: ["depilacion-laser"],
      citasAgendadas: [], // Libre a las 10:00
    },
  ];

  const laserUnico: RecursoFisico = {
    id: "laser-diode-1",
    negocioId: "neg-clinica",
    nombre: "Equipo Láser Diodo #1",
    tipo: "EQUIPO_LASER",
    activo: true,
    serviciosCompatiblesIds: ["depilacion-laser"],
    reservasAsignadas: [
      {
        citaId: "cita-ana-10",
        especialistaId: "esp-ana",
        fecha: "2026-11-25",
        inicio: "10:00",
        fin: "11:00",
        estado: "confirmada",
      },
    ],
  };

  it("rechaza con SIN_RECURSO_FISICO_DISPONIBLE aunque haya otro especialista libre en el mismo horario", () => {
    const asignacionEsp = MotorAsignacionEspecialistas.asignar(
      {
        servicioId: "depilacion-laser",
        fecha: "2026-11-25",
        horaInicio: "10:00",
        duracionMin: 60,
      },
      especialistas
    );
    expect(asignacionEsp.asignado).toBe(true);
    expect(asignacionEsp.especialistaId).toBe("esp-bruno");

    const asignacionRecurso = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        negocioId: "neg-clinica",
        servicioId: "depilacion-laser",
        fecha: "2026-11-25",
        horaInicio: "10:00",
        duracionMin: 60,
      },
      [laserUnico]
    );

    expect(asignacionRecurso.asignado).toBe(false);
    expect(asignacionRecurso.codigoDiagnostico).toBe(
      "SIN_RECURSO_FISICO_DISPONIBLE"
    );
    expect(asignacionRecurso.recursoId).toBeNull();
    expect(asignacionRecurso.recursosCompatiblesCount).toBe(1);
    expect(asignacionRecurso.conflictosDetectados).toHaveLength(1);
    expect(asignacionRecurso.conflictosDetectados[0]?.motivo).toBe(
      "COLISION_CITA_O_BUFFER"
    );
    expect(
      asignacionRecurso.conflictosDetectados[0]?.citasEnConflicto[0]
    ).toMatchObject({
      citaId: "cita-ana-10",
      especialistaId: "esp-ana",
      horaInicio: "10:00",
      horaFin: "11:00",
    });
  });

  it("permite reutilizar el mismo recurso al reprogramar excluyendo el propio citaId", () => {
    const res = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        negocioId: "neg-clinica",
        servicioId: "depilacion-laser",
        fecha: "2026-11-25",
        horaInicio: "10:30",
        duracionMin: 60,
        excluirCitaId: "cita-ana-10",
      },
      [laserUnico]
    );

    expect(res.asignado).toBe(true);
    expect(res.recursoId).toBe("laser-diode-1");
  });
});

describe("recursosFisicos - balanceo por menor carga, buffers y mantenimiento", () => {
  it("asigna la sala o silla compatible con menor carga del día y expone alternativas", () => {
    const salas: RecursoFisico[] = [
      {
        id: "sala-1",
        nombre: "Sala Masaje Bambú",
        tipo: "SALA_MASAJE",
        activo: true,
        serviciosCompatiblesIds: ["masaje-sueco"],
        reservasAsignadas: [
          {
            citaId: "c-1",
            fecha: "2026-11-26",
            inicio: "09:00",
            fin: "10:00",
          },
          {
            citaId: "c-2",
            fecha: "2026-11-26",
            inicio: "11:00",
            fin: "12:00",
          },
        ],
      },
      {
        id: "sala-2",
        nombre: "Sala Masaje Piedras",
        tipo: "SALA_MASAJE",
        activo: true,
        serviciosCompatiblesIds: ["masaje-sueco"],
        reservasAsignadas: [
          {
            citaId: "c-3",
            fecha: "2026-11-26",
            inicio: "09:00",
            fin: "10:30",
          },
        ],
      },
      {
        id: "sala-3",
        nombre: "Sala Masaje VIP",
        tipo: "SALA_MASAJE",
        activo: true,
        serviciosCompatiblesIds: ["masaje-sueco"],
        reservasAsignadas: [
          {
            citaId: "c-4",
            fecha: "2026-11-26",
            inicio: "09:00",
            fin: "09:30", // Misma cantidad de citas que sala-2 (1), pero menos minutos (30 vs 90)
          },
          {
            citaId: "c-5-cancelada",
            fecha: "2026-11-26",
            inicio: "14:00",
            fin: "15:00",
            estado: "cancelada",
          },
        ],
      },
    ];

    const res = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "masaje-sueco",
        fecha: "2026-11-26",
        horaInicio: "14:00",
        duracionMin: 60,
      },
      salas
    );

    expect(res.asignado).toBe(true);
    expect(res.codigoDiagnostico).toBe("RECURSO_ASIGNADO");
    expect(res.recursoId).toBe("sala-3");
    expect(res.cargaRecursoAsignado).toBe(1);
    expect(res.alternativasDisponibles.map((a) => a.recursoId)).toEqual([
      "sala-2",
      "sala-1",
    ]);
  });

  it("respeta buffers asimétricos de limpieza/esterilización y bloqueos de mantenimiento", () => {
    expect(intervalosConBufferSeSolapan(600, 675, 675, 735)).toBe(false);
    expect(intervalosConBufferSeSolapan(600, 675, 670, 730)).toBe(true);

    const cabina: RecursoFisico = {
      id: "cab-esteril",
      nombre: "Cabina Estética A",
      tipo: "CABINA",
      activo: true,
      serviciosCompatiblesIds: ["limpieza-facial"],
      bufferLimpiezaMin: { antesMin: 5, despuesMin: 15 },
      horarioPorDia: {
        4: { abre: "09:00", cierra: "18:00", activo: true }, // Jueves 2026-11-26
      },
      bloqueosMantenimiento: [
        {
          fecha: "2026-11-26",
          inicio: "13:00",
          fin: "14:00",
          motivo: "Calibración UV",
        },
      ],
      reservasAsignadas: [
        {
          citaId: "c-10",
          inicio: "2026-11-26T10:00:00",
          fin: "2026-11-26T11:00:00",
        },
      ],
    };

    // 11:00 colisiona con 15m limpieza posterior (hasta 11:15) y 5m prep previa (desde 10:55)
    const colisionBuffer = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "limpieza-facial",
        fecha: "2026-11-26",
        horaInicio: "11:00",
        duracionMin: 45,
      },
      [cabina]
    );
    expect(colisionBuffer.asignado).toBe(false);
    expect(colisionBuffer.codigoDiagnostico).toBe(
      "SIN_RECURSO_FISICO_DISPONIBLE"
    );

    // 11:20 tiene 5m prep desde 11:15 == fin de limpieza de cita previa (11:15) -> válido
    const librePostBuffer = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "limpieza-facial",
        fecha: "2026-11-26",
        horaInicio: "11:20",
        duracionMin: 45,
      },
      [cabina]
    );
    expect(librePostBuffer.asignado).toBe(true);

    // 13:15 cae dentro del bloqueo de mantenimiento
    const enMantenimiento = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "limpieza-facial",
        fecha: "2026-11-26",
        horaInicio: "13:15",
        duracionMin: 30,
      },
      [cabina]
    );
    expect(enMantenimiento.asignado).toBe(false);
    expect(enMantenimiento.conflictosDetectados[0]?.motivo).toBe(
      "EN_MANTENIMIENTO"
    );
    expect(enMantenimiento.conflictosDetectados[0]?.detalle).toContain(
      "Calibración UV"
    );
  });

  it("maneja capacidadSimultanea > 1, cupos diarios, ausencia de compatibles y asignación múltiple atómica", () => {
    const sillaCompartida: RecursoFisico = {
      id: "zona-sillas",
      nombre: "Estación Compartida Barbería",
      tipo: "SILLA_COMPARTIDA",
      activo: true,
      capacidadSimultanea: 2,
      serviciosCompatiblesIds: ["corte-barberia", "combo-cabina-laser"],
      reservasAsignadas: [
        { citaId: "b-1", fecha: "2026-11-27", inicio: "10:00", fin: "11:00" },
        { citaId: "b-2", fecha: "2026-11-27", inicio: "11:00", fin: "12:00" },
      ],
    };

    // En 10:30-11:30 las dos citas no se solapan entre sí (pico 1 < 2) -> entra
    const cabeEnSegundoPuesto = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "corte-barberia",
        fecha: "2026-11-27",
        horaInicio: "10:30",
        duracionMin: 60,
      },
      [sillaCompartida]
    );
    expect(cabeEnSegundoPuesto.asignado).toBe(true);

    // Si agregamos otra cita 10:00-11:00, el pico de 10:00-11:00 pasa a 2 == capacidad -> rechaza
    const sillaLlena: RecursoFisico = {
      ...sillaCompartida,
      reservasAsignadas: [
        ...(sillaCompartida.reservasAsignadas ?? []),
        { citaId: "b-3", fecha: "2026-11-27", inicio: "10:00", fin: "11:00" },
      ],
    };
    const rechazaCapacidad = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "corte-barberia",
        fecha: "2026-11-27",
        horaInicio: "10:15",
        duracionMin: 30,
      },
      [sillaLlena]
    );
    expect(rechazaCapacidad.asignado).toBe(false);
    expect(rechazaCapacidad.conflictosDetectados[0]?.motivo).toBe(
      "CAPACIDAD_SIMULTANEA_AGOTADA"
    );

    // Sin recurso compatible
    const sinCompatible = MotorRecursosFisicos.asignarRecursoOptimo(
      {
        servicioId: "cirugia-inexistente",
        fecha: "2026-11-27",
        horaInicio: "10:00",
        duracionMin: 30,
      },
      [sillaCompartida]
    );
    expect(sinCompatible.asignado).toBe(false);
    expect(sinCompatible.codigoDiagnostico).toBe("SIN_RECURSO_COMPATIBLE");

    // Asignación múltiple atómica (Cabina + Láser) y cálculo de slots disponibles
    const cabina: RecursoFisico = {
      id: "cab-1",
      nombre: "Cabina Principal",
      tipo: "CABINA",
      activo: true,
      serviciosCompatiblesIds: ["combo-cabina-laser"],
    };
    const laser: RecursoFisico = {
      id: "laser-1",
      nombre: "Láser Alejandrita",
      tipo: "EQUIPO_LASER",
      activo: true,
      serviciosCompatiblesIds: ["combo-cabina-laser"],
      reservasAsignadas: [
        { citaId: "l-1", fecha: "2026-11-27", inicio: "10:00", fin: "11:00" },
      ],
    };

    const multipleOk = MotorRecursosFisicos.asignarRecursosMultiples(
      {
        servicioId: "combo-cabina-laser",
        fecha: "2026-11-27",
        horaInicio: "11:00",
        duracionMin: 60,
        requisitos: [
          { tipoRecursoRequerido: "CABINA" },
          { tipoRecursoRequerido: "EQUIPO_LASER" },
        ],
      },
      [cabina, laser]
    );
    expect(multipleOk.asignado).toBe(true);
    expect(multipleOk.recursosAsignadosIds).toEqual(["cab-1", "laser-1"]);

    const multipleContencion = MotorRecursosFisicos.asignarRecursosMultiples(
      {
        servicioId: "combo-cabina-laser",
        fecha: "2026-11-27",
        horaInicio: "10:00",
        duracionMin: 60,
        requisitos: [
          { tipoRecursoRequerido: "CABINA" },
          { tipoRecursoRequerido: "EQUIPO_LASER" },
        ],
      },
      [cabina, laser]
    );
    expect(multipleContencion.asignado).toBe(false);
    expect(multipleContencion.codigoDiagnostico).toBe(
      "SIN_RECURSO_FISICO_DISPONIBLE"
    );
    expect(multipleContencion.recursosAsignadosIds).toEqual([]);

    const slotsConLaser = MotorRecursosFisicos.calcularSlotsDisponiblesConRecurso({
      servicioId: "combo-cabina-laser",
      fecha: "2026-11-27",
      horarioAtencion: { abre: "09:00", cierra: "13:00", activo: true },
      duracionServicioMin: 60,
      pasoMin: 60,
      recursos: [laser],
    });
    expect(slotsConLaser).toEqual(["09:00", "11:00", "12:00"]);
  });
});
