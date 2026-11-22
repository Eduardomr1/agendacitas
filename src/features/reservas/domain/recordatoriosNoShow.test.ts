import { describe, expect, it } from "vitest";
import {
  calcularLimitesFueraDeSilencio,
  estaEnHorasDeSilencio,
  MotorRecordatoriosNoShow,
  POLITICA_RECORDATORIOS_POR_DEFECTO,
  validarPoliticaRecordatorios,
  type ReglaCadenciaRecordatorio,
  type VentanaSilencioConfig,
} from "./recordatoriosNoShow";

describe("recordatoriosNoShow - validación y horas de silencio", () => {
  it("valida correctamente la política por defecto y rechaza configuraciones inconsistentes", () => {
    expect(
      validarPoliticaRecordatorios(POLITICA_RECORDATORIOS_POR_DEFECTO).valido
    ).toBe(true);

    const invalida = validarPoliticaRecordatorios({
      ventanaSilencio: {
        activa: true,
        inicioHora: "22:00",
        finHora: "22:00",
      },
      margenMinimoAntesCitaMin: -10,
      separacionMinimaEntreEnviosMin: -5,
      horasLimiteConfirmacionAltoRiesgo: 0,
      horasLimiteConfirmacionCritico: -2,
      porcentajeAnticipoEximeAutoLiberacion: 120,
      reglasPorNivel: {
        ALTO: [
          {
            codigo: "DUP",
            horasAntesCita: 24,
            canalPreferido: "EMAIL",
            proposito: "RECORDATORIO_INFORMATIVO",
          },
          {
            codigo: "DUP",
            horasAntesCita: 0,
            canalPreferido: "SMS",
            proposito: "ULTIMO_AVISO",
          },
        ],
      },
    });

    expect(invalida.valido).toBe(false);
    expect(invalida.errores.length).toBeGreaterThanOrEqual(7);
  });

  it("detecta horas de silencio con cruce de medianoche, intra-día y desfase UTC", () => {
    const nocturna: VentanaSilencioConfig = {
      activa: true,
      inicioHora: "21:00",
      finHora: "08:00",
    };

    // En UTC (offset 0)
    expect(
      estaEnHorasDeSilencio(new Date("2026-11-24T20:59:00Z"), nocturna, 0)
    ).toBe(false);
    expect(
      estaEnHorasDeSilencio(new Date("2026-11-24T21:00:00Z"), nocturna, 0)
    ).toBe(true);
    expect(
      estaEnHorasDeSilencio(new Date("2026-11-25T03:30:00Z"), nocturna, 0)
    ).toBe(true);
    expect(
      estaEnHorasDeSilencio(new Date("2026-11-25T07:59:00Z"), nocturna, 0)
    ).toBe(true);
    expect(
      estaEnHorasDeSilencio(new Date("2026-11-25T08:00:00Z"), nocturna, 0)
    ).toBe(false);

    // En UTC-6 (-360 min): 2026-11-25T04:00:00Z equivale a 2026-11-24 22:00 local (silencio)
    const utc0400 = new Date("2026-11-25T04:00:00Z");
    expect(estaEnHorasDeSilencio(utc0400, nocturna, -360)).toBe(true);

    const limites = calcularLimitesFueraDeSilencio(utc0400, nocturna, -360);
    // 20:59 local del 24 = 2026-11-25T02:59:00Z; 08:00 local del 25 = 2026-11-25T14:00:00Z
    expect(limites.antesSilencio.toISOString()).toBe("2026-11-25T02:59:00.000Z");
    expect(limites.despuesSilencio.toISOString()).toBe("2026-11-25T14:00:00.000Z");
    expect(estaEnHorasDeSilencio(limites.antesSilencio, nocturna, -360)).toBe(false);
    expect(estaEnHorasDeSilencio(limites.despuesSilencio, nocturna, -360)).toBe(false);

    // Ventana intra-día (siesta 13:00 a 15:00)
    const intraDia: VentanaSilencioConfig = {
      activa: true,
      inicioHora: "13:00",
      finHora: "15:00",
    };
    expect(
      estaEnHorasDeSilencio(new Date("2026-11-25T14:15:00Z"), intraDia, 0)
    ).toBe(true);
    const limSiesta = calcularLimitesFueraDeSilencio(
      new Date("2026-11-25T14:15:00Z"),
      intraDia,
      0
    );
    expect(limSiesta.antesSilencio.toISOString()).toBe("2026-11-25T12:59:00.000Z");
    expect(limSiesta.despuesSilencio.toISOString()).toBe("2026-11-25T15:00:00.000Z");

    // Ventana inactiva o degenerada no bloquea envíos
    expect(
      estaEnHorasDeSilencio(
        new Date("2026-11-25T02:00:00Z"),
        { activa: false, inicioHora: "21:00", finHora: "08:00" },
        0
      )
    ).toBe(false);
    expect(
      estaEnHorasDeSilencio(
        new Date("2026-11-25T02:00:00Z"),
        { activa: true, inicioHora: "10:00", finHora: "10:00" },
        0
      )
    ).toBe(false);
  });
});

describe("MotorRecordatoriosNoShow.evaluarRiesgoNoShow", () => {
  it("clasifica BAJO para cliente confiable con anticipo y acota puntaje en 0", () => {
    const res = MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
      inicioCita: new Date("2026-11-27T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"), // 48h
      precioTotalCentavos: 40_000,
      anticipoPagadoCentavos: 20_000, // 50%
      historialCliente: {
        totalCitasPrevias: 6,
        noShowsPrevios: 0,
        citasCompletadasPrevias: 6,
      },
    });

    expect(res.puntajeRiesgo).toBe(0);
    expect(res.nivelRiesgo).toBe("BAJO");
    expect(res.requiereConfirmacionExplicita).toBe(false);
    expect(res.sugiereAnticipoPreventivo).toBe(false);
    expect(res.factores.map((f) => f.codigo)).toContain("HISTORIAL_CONFIABLE");
    expect(res.factores.map((f) => f.codigo)).toContain("ANTICIPO_CUBIERTO");
  });

  it("clasifica MODERADO para cliente nuevo sin anticipo con reserva a 48 horas", () => {
    const res = MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
      inicioCita: new Date("2026-11-27T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
      precioTotalCentavos: 30_000,
    });

    expect(res.puntajeRiesgo).toBe(25);
    expect(res.nivelRiesgo).toBe("MODERADO");
    expect(res.requiereConfirmacionExplicita).toBe(false);
  });

  it("eleva a ALTO para cliente nuevo con reserva >14 días y servicio de alto valor sin anticipo", () => {
    const res = MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
      inicioCita: new Date("2026-12-12T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"), // 17 días
      precioTotalCentavos: 80_000,
      anticipoPagadoCentavos: 0,
    });

    // Base 15 + 10 nuevo + 18 >=14d + 8 alto valor = 51
    expect(res.puntajeRiesgo).toBe(51);
    expect(res.nivelRiesgo).toBe("ALTO");
    expect(res.requiereConfirmacionExplicita).toBe(true);
    expect(res.sugiereAnticipoPreventivo).toBe(true);
  });

  it("clasifica CRITICO ante reincidencia de no-shows recientes y cancelaciones tardías", () => {
    const res = MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
      inicioCita: new Date("2026-12-05T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"), // 10 días
      precioTotalCentavos: 55_000,
      historialCliente: {
        totalCitasPrevias: 3,
        noShowsPrevios: 2,
        ultimoNoShowHaceDias: 10,
        cancelacionesTardiasPrevias: 1,
      },
    });

    expect(res.nivelRiesgo).toBe("CRITICO");
    expect(res.puntajeRiesgo).toBeGreaterThanOrEqual(75);
    expect(res.puntajeRiesgo).toBeLessThanOrEqual(100);
    expect(res.requiereConfirmacionExplicita).toBe(true);
    expect(res.sugiereAnticipoPreventivo).toBe(true);
  });

  it("reduce el riesgo cuando el cliente paga el 100% y confirma explícitamente", () => {
    const res = MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
      inicioCita: new Date("2026-12-05T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
      precioTotalCentavos: 55_000,
      anticipoPagadoCentavos: 55_000,
      confirmadaPorCliente: true,
      historialCliente: {
        totalCitasPrevias: 3,
        noShowsPrevios: 2,
        ultimoNoShowHaceDias: 10,
      },
    });

    // 15 + 43 + 12 + 10 - 25 - 15 = 40 (MODERADO)
    expect(res.puntajeRiesgo).toBe(40);
    expect(res.nivelRiesgo).toBe("MODERADO");
    expect(res.requiereConfirmacionExplicita).toBe(false);
    expect(res.sugiereAnticipoPreventivo).toBe(false);
  });

  it("bonifica reservas creadas el mismo día dentro de las 6 horas previas", () => {
    const res = MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
      inicioCita: new Date("2026-11-25T17:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T13:00:00Z"), // 4h
      precioTotalCentavos: 25_000,
    });

    // Base 15 + 10 cliente nuevo - 8 reserva inmediata = 17 (BAJO)
    expect(res.puntajeRiesgo).toBe(17);
    expect(res.nivelRiesgo).toBe("BAJO");
    expect(res.factores.map((f) => f.codigo)).toContain("RESERVA_INMEDIATA");
  });

  it("rechaza invariantes financieros o de historial inconsistentes", () => {
    expect(() =>
      MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
        inicioCita: new Date("2026-11-27T16:00:00Z"),
        fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
        precioTotalCentavos: 20_000,
        anticipoPagadoCentavos: 25_000,
      })
    ).toThrow(/anticipo pagado/);

    expect(() =>
      MotorRecordatoriosNoShow.evaluarRiesgoNoShow({
        inicioCita: new Date("2026-11-27T16:00:00Z"),
        fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
        precioTotalCentavos: 20_000,
        historialCliente: {
          totalCitasPrevias: 0,
          noShowsPrevios: 1,
        },
      })
    ).toThrow(/no-shows previos/);
  });
});

describe("MotorRecordatoriosNoShow.planificar", () => {
  it("ajusta horarios dentro de horas de silencio adelantando antes de 21:00 o posponiendo a 08:00", () => {
    // Cita a las 09:00 UTC del 28 Nov -> 4h antes cae a 05:00 UTC (en silencio 21:00-08:00)
    const planAdelantar = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-100",
      inicioCita: new Date("2026-11-28T09:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 30_000, // MODERADO (48h EMAIL + 4h WHATSAPP)
      offsetMinutosZonaHoraria: 0,
    });

    expect(planAdelantar.evaluacionRiesgo.nivelRiesgo).toBe("MODERADO");
    expect(planAdelantar.recordatoriosProgramados).toHaveLength(2);

    const ultimoAviso = planAdelantar.recordatoriosProgramados.find(
      (r) => r.codigoRegla === "ULTIMO_AVISO_4H"
    );
    expect(ultimoAviso?.ajustadoPorSilencio).toBe(true);
    expect(ultimoAviso?.programadoPara?.toISOString()).toBe(
      "2026-11-27T20:59:00.000Z"
    );

    // Con estrategia POSPONER_DESPUES_SILENCIO: 05:00 se mueve a 08:00 (1h antes de 09:00 >= 30min margen)
    const planPosponer = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-101",
      inicioCita: new Date("2026-11-28T09:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 30_000,
      offsetMinutosZonaHoraria: 0,
      politica: {
        ventanaSilencio: {
          activa: true,
          inicioHora: "21:00",
          finHora: "08:00",
          estrategiaAjuste: "POSPONER_DESPUES_SILENCIO",
        },
      },
    });

    const avisoPospuesto = planPosponer.recordatoriosProgramados.find(
      (r) => r.codigoRegla === "ULTIMO_AVISO_4H"
    );
    expect(avisoPospuesto?.programadoPara?.toISOString()).toBe(
      "2026-11-28T08:00:00.000Z"
    );

    // Invariante: ningún recordatorio programado puede quedar dentro de silencio
    for (const r of planPosponer.recordatoriosProgramados) {
      expect(r.programadoPara).not.toBeNull();
      expect(
        estaEnHorasDeSilencio(
          r.programadoPara as Date,
          POLITICA_RECORDATORIOS_POR_DEFECTO.ventanaSilencio,
          0
        )
      ).toBe(false);
    }
  });

  it("recurre a 08:00 cuando adelantar cae en el pasado, y omite si ni 08:00 respeta margen mínimo", () => {
    // Ahora: 06:30 UTC del 28 Nov. Cita: 10:00 UTC del 28 Nov.
    // Regla 4h antes -> 06:00 (silencio). Adelantar -> 27 Nov 20:59 (< ahora). Posponer -> 28 Nov 08:00 (válido!)
    const planRescatado = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-200",
      inicioCita: new Date("2026-11-28T10:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-28T06:30:00Z"),
      ahora: new Date("2026-11-28T06:30:00Z"),
      precioTotalCentavos: 30_000,
      politica: {
        reglasPorNivel: {
          BAJO: [
            {
              codigo: "AVISO_4H",
              horasAntesCita: 4,
              canalPreferido: "WHATSAPP",
              proposito: "ULTIMO_AVISO",
            },
          ],
        },
      },
    });
    expect(planRescatado.recordatoriosProgramados).toHaveLength(1);
    expect(
      planRescatado.recordatoriosProgramados[0]?.programadoPara?.toISOString()
    ).toBe("2026-11-28T08:00:00.000Z");

    // Ahora: 06:30 UTC, cita: 08:15 UTC (margen 30 min -> límite 07:45 UTC).
    // 08:00 supera 07:45 y 20:59 del día previo está en el pasado -> OMITIDO_POR_VENTANA
    const planSinVentana = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-201",
      inicioCita: new Date("2026-11-28T08:15:00Z"),
      fechaCreacionReserva: new Date("2026-11-28T06:30:00Z"),
      ahora: new Date("2026-11-28T06:30:00Z"),
      precioTotalCentavos: 30_000,
      politica: {
        margenMinimoAntesCitaMin: 30,
        reglasPorNivel: {
          BAJO: [
            {
              codigo: "AVISO_2H",
              horasAntesCita: 2,
              canalPreferido: "WHATSAPP",
              proposito: "ULTIMO_AVISO",
            },
          ],
        },
      },
    });
    expect(planSinVentana.recordatoriosProgramados).toHaveLength(0);
    expect(planSinVentana.recordatoriosOmitidos[0]?.estado).toBe(
      "OMITIDO_POR_VENTANA"
    );
  });

  it("aplica fallback de canales ante opt-out o falta de teléfono y marca OMITIDO_SIN_CANAL si ninguno sirve", () => {
    const planFallback = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-300",
      inicioCita: new Date("2026-11-30T15:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T12:00:00Z"),
      ahora: new Date("2026-11-25T12:00:00Z"),
      precioTotalCentavos: 30_000, // MODERADO
      preferenciasCliente: {
        tieneEmail: true,
        tieneTelefono: false,
      },
    });

    const ultimoAviso = planFallback.recordatoriosProgramados.find(
      (r) => r.codigoRegla === "ULTIMO_AVISO_4H"
    );
    expect(ultimoAviso?.canalSolicitado).toBe("WHATSAPP");
    expect(ultimoAviso?.canalEfectivo).toBe("EMAIL");

    const planSinCanal = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-301",
      inicioCita: new Date("2026-11-30T15:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T12:00:00Z"),
      ahora: new Date("2026-11-25T12:00:00Z"),
      precioTotalCentavos: 30_000,
      preferenciasCliente: {
        tieneEmail: true,
        tieneTelefono: true,
        canalesBloqueados: ["EMAIL", "WHATSAPP", "SMS", "PUSH"],
      },
    });

    expect(planSinCanal.recordatoriosProgramados).toHaveLength(0);
    expect(
      planSinCanal.recordatoriosOmitidos.every(
        (r) => r.estado === "OMITIDO_SIN_CANAL"
      )
    ).toBe(true);
  });

  it("deduplica colisiones de cadencia priorizando SOLICITUD_CONFIRMACION sobre RECORDATORIO_INFORMATIVO", () => {
    // Cita a las 09:00 UTC del 28 Nov:
    // Regla A (informativa, 10h antes -> 23:00 del 27 -> ajustada a 20:59 del 27)
    // Regla B (confirmación, 6h antes -> 03:00 del 28 -> ajustada a 20:59 del 27)
    const reglasColision: ReglaCadenciaRecordatorio[] = [
      {
        codigo: "INFO_10H",
        horasAntesCita: 10,
        canalPreferido: "EMAIL",
        proposito: "RECORDATORIO_INFORMATIVO",
      },
      {
        codigo: "CONF_6H",
        horasAntesCita: 6,
        canalPreferido: "WHATSAPP",
        proposito: "SOLICITUD_CONFIRMACION",
      },
    ];

    const plan = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-400",
      inicioCita: new Date("2026-11-28T09:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 30_000,
      politica: {
        separacionMinimaEntreEnviosMin: 90,
        reglasPorNivel: {
          MODERADO: reglasColision,
        },
      },
    });

    expect(plan.recordatoriosProgramados).toHaveLength(1);
    expect(plan.recordatoriosProgramados[0]?.codigoRegla).toBe("CONF_6H");
    expect(plan.recordatoriosOmitidos).toHaveLength(1);
    expect(plan.recordatoriosOmitidos[0]?.codigoRegla).toBe("INFO_10H");
    expect(plan.recordatoriosOmitidos[0]?.estado).toBe(
      "OMITIDO_POR_COLISION_CADENCIA"
    );
  });

  it("define auto-liberación a lista de espera para riesgo CRITICO sin anticipo y la exime si cubre >=50%", () => {
    const base = {
      citaId: "cita-500",
      inicioCita: new Date("2026-12-05T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 60_000,
      historialCliente: {
        totalCitasPrevias: 3,
        noShowsPrevios: 2,
        ultimoNoShowHaceDias: 5,
        cancelacionesTardiasPrevias: 2,
      },
    };

    const sinAnticipo = MotorRecordatoriosNoShow.planificar(base);
    expect(sinAnticipo.evaluacionRiesgo.nivelRiesgo).toBe("CRITICO");
    expect(sinAnticipo.accionVencimientoConfirmacion).toBe(
      "LIBERAR_A_LISTA_ESPERA"
    );
    expect(sinAnticipo.fechaLimiteConfirmacion?.toISOString()).toBe(
      "2026-12-04T16:00:00.000Z"
    );

    // Con 50% de anticipo (30,000), sigue siendo riesgo elevado pero exime auto-liberación
    const conAnticipoAlto = MotorRecordatoriosNoShow.planificar({
      ...base,
      citaId: "cita-501",
      anticipoPagadoCentavos: 30_000,
    });
    expect(conAnticipoAlto.accionVencimientoConfirmacion).toBe(
      "ALERTAR_ADMINISTRADOR"
    );
  });

  it("asigna ventana de gracia si la reserva crítica se crea dentro del umbral de confirmación y omite reglas en citas pasadas", () => {
    // Reserva crítica creada 6h antes de la cita (menor al límite nominal de 24h)
    const planCorto = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-550",
      inicioCita: new Date("2026-11-25T18:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T12:00:00Z"),
      ahora: new Date("2026-11-25T12:00:00Z"),
      precioTotalCentavos: 80_000,
      historialCliente: {
        totalCitasPrevias: 3,
        noShowsPrevios: 3,
        ultimoNoShowHaceDias: 3,
        cancelacionesTardiasPrevias: 2,
      },
    });
    expect(planCorto.evaluacionRiesgo.nivelRiesgo).toBe("CRITICO");
    // Ventana de gracia: ahora + 2h = 14:00 UTC (menor a 17:30 límite último envío)
    expect(planCorto.fechaLimiteConfirmacion?.toISOString()).toBe(
      "2026-11-25T14:00:00.000Z"
    );

    // Cita ya iniciada o en el pasado
    const planPasado = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-551",
      inicioCita: new Date("2026-11-25T10:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-24T10:00:00Z"),
      ahora: new Date("2026-11-25T10:05:00Z"),
      precioTotalCentavos: 30_000,
    });
    expect(planPasado.recordatoriosProgramados).toHaveLength(0);
    expect(
      planPasado.recordatoriosOmitidos.every(
        (r) => r.estado === "OMITIDO_EN_PASADO"
      )
    ).toBe(true);
    expect(planPasado.fechaLimiteConfirmacion).toBeNull();
  });

  it("respeta offsetMinutosZonaHoraria en horas de silencio, omite confirmaciones si ya está confirmada y valida invariantes", () => {
    // UTC-6 (-360 min): cita 15:00 UTC = 09:00 local del 28 Nov -> 4h antes = 11:00 UTC = 05:00 local (en silencio 21:00-08:00)
    // Adelantar a 20:59 local del 27 Nov = 2026-11-28T02:59:00Z
    const planLocal = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-560",
      inicioCita: new Date("2026-11-28T15:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
      ahora: new Date("2026-11-25T16:00:00Z"),
      precioTotalCentavos: 30_000,
      offsetMinutosZonaHoraria: -360,
    });

    const ultimoAviso = planLocal.recordatoriosProgramados.find(
      (r) => r.codigoRegla === "ULTIMO_AVISO_4H"
    );
    expect(ultimoAviso?.ajustadoPorSilencio).toBe(true);
    expect(ultimoAviso?.programadoPara?.toISOString()).toBe(
      "2026-11-28T02:59:00.000Z"
    );

    // Cita de riesgo alto pero ya confirmada: omite SOLICITUD_CONFIRMACION en planificación
    const planYaConfirmado = MotorRecordatoriosNoShow.planificar({
      citaId: "cita-561",
      inicioCita: new Date("2026-12-12T16:00:00Z"),
      fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
      ahora: new Date("2026-11-25T10:00:00Z"),
      precioTotalCentavos: 80_000,
      confirmadaPorCliente: true,
      historialCliente: {
        totalCitasPrevias: 3,
        noShowsPrevios: 2,
        ultimoNoShowHaceDias: 5,
      },
    });
    expect(
      planYaConfirmado.recordatoriosOmitidos.some(
        (r) => r.estado === "OMITIDO_YA_CONFIRMADA"
      )
    ).toBe(true);
    expect(planYaConfirmado.fechaLimiteConfirmacion).toBeNull();
    expect(planYaConfirmado.accionVencimientoConfirmacion).toBe("NINGUNA");

    expect(() =>
      MotorRecordatoriosNoShow.planificar({
        citaId: "   ",
        inicioCita: new Date("2026-11-28T15:00:00Z"),
        fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
        ahora: new Date("2026-11-25T16:00:00Z"),
        precioTotalCentavos: 30_000,
      })
    ).toThrow(/citaId/);

    expect(() =>
      MotorRecordatoriosNoShow.planificar({
        citaId: "cita-err",
        inicioCita: new Date("2026-11-28T15:00:00Z"),
        fechaCreacionReserva: new Date("2026-11-25T16:00:00Z"),
        ahora: new Date("2026-11-25T16:00:00Z"),
        precioTotalCentavos: 30_000,
        offsetMinutosZonaHoraria: 999,
      })
    ).toThrow(/offsetMinutosZonaHoraria/);
  });
});

describe("MotorRecordatoriosNoShow.evaluarDespacho", () => {
  const planCritico = MotorRecordatoriosNoShow.planificar({
    citaId: "cita-600",
    inicioCita: new Date("2026-12-05T16:00:00Z"),
    fechaCreacionReserva: new Date("2026-11-25T10:00:00Z"),
    ahora: new Date("2026-11-25T10:00:00Z"),
    precioTotalCentavos: 60_000,
    historialCliente: {
      totalCitasPrevias: 3,
      noShowsPrevios: 2,
      ultimoNoShowHaceDias: 5,
      cancelacionesTardiasPrevias: 2,
    },
  });

  it("despacha de forma idempotente solo envíos vencidos no enviados y reporta vencimiento de confirmación", () => {
    // 2026-12-04T16:05:00Z: ya venció 72h, 36h y la fecha límite de confirmación (24h = 16:00)
    const despacho1 = MotorRecordatoriosNoShow.evaluarDespacho(planCritico, {
      ahora: new Date("2026-12-04T16:05:00Z"),
      estadoCita: "pendiente",
      confirmadaPorCliente: false,
      idsYaEnviados: ["cita-600:RECORDATORIO_72H"],
    });

    expect(despacho1.listosParaEnviar.map((r) => r.codigoRegla)).toEqual([
      "CONFIRMACION_36H",
    ]);
    expect(despacho1.pendientesFuturos.map((r) => r.codigoRegla)).toEqual([
      "CONFIRMACION_12H",
      "ULTIMO_AVISO_2H",
    ]);
    expect(despacho1.confirmacionVencida).toBe(true);
    expect(despacho1.accionRecomendada).toBe("LIBERAR_A_LISTA_ESPERA");
  });

  it("suprime solicitudes de confirmación si el cliente confirma anticipadamente y mantiene último aviso", () => {
    const despachoConfirmado = MotorRecordatoriosNoShow.evaluarDespacho(
      planCritico,
      {
        ahora: new Date("2026-12-05T14:30:00Z"),
        estadoCita: "confirmada",
        confirmadaPorCliente: true,
        idsYaEnviados: ["cita-600:RECORDATORIO_72H"],
      }
    );

    expect(despachoConfirmado.suprimidos.map((s) => s.codigoRegla)).toEqual([
      "CONFIRMACION_36H",
      "CONFIRMACION_12H",
    ]);
    expect(
      despachoConfirmado.listosParaEnviar.map((r) => r.codigoRegla)
    ).toEqual(["ULTIMO_AVISO_2H"]);
    expect(despachoConfirmado.confirmacionVencida).toBe(false);
    expect(despachoConfirmado.accionRecomendada).toBe("NINGUNA");
  });

  it("suprime toda la cola pendiente cuando la cita fue cancelada o completada", () => {
    const despachoCancelado = MotorRecordatoriosNoShow.evaluarDespacho(
      planCritico,
      {
        ahora: new Date("2026-12-04T17:00:00Z"),
        estadoCita: "cancelada",
        confirmadaPorCliente: false,
        idsYaEnviados: ["cita-600:RECORDATORIO_72H"],
      }
    );

    expect(despachoCancelado.listosParaEnviar).toHaveLength(0);
    expect(despachoCancelado.pendientesFuturos).toHaveLength(0);
    expect(despachoCancelado.suprimidos).toHaveLength(3);
    expect(
      despachoCancelado.suprimidos.every((s) => s.motivo === "CITA_CANCELADA")
    ).toBe(true);
    expect(despachoCancelado.confirmacionVencida).toBe(false);
    expect(despachoCancelado.accionRecomendada).toBe("NINGUNA");

    const despachoCompletado = MotorRecordatoriosNoShow.evaluarDespacho(
      planCritico,
      {
        ahora: new Date("2026-12-05T17:00:00Z"),
        estadoCita: "completada",
        confirmadaPorCliente: true,
      }
    );
    expect(despachoCompletado.listosParaEnviar).toHaveLength(0);
    expect(
      despachoCompletado.suprimidos.every((s) => s.motivo === "CITA_COMPLETADA")
    ).toBe(true);
  });
});
