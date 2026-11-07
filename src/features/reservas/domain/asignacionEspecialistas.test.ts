import { describe, expect, it } from 'vitest';
import {
  Especialista,
  MotorAsignacionEspecialistas,
  SolicitudAsignacionEspecialista,
} from './asignacionEspecialistas';

describe('MotorAsignacionEspecialistas', () => {
  const staff: Especialista[] = [
    {
      id: 'esp-ana',
      nombre: 'Dra. Ana López',
      activo: true,
      serviciosHabilitados: ['limpieza-dental', 'blanqueamiento'],
      horarioPorDia: {
        1: { abre: '09:00', cierra: '17:00', activo: true }, // Lunes
      },
      citasAgendadas: [
        { inicio: '2026-11-09T10:00:00', fin: '2026-11-09T11:00:00' },
      ],
      maxCitasDiarias: 5,
    },
    {
      id: 'esp-carlos',
      nombre: 'Dr. Carlos Mendoza',
      activo: true,
      serviciosHabilitados: ['limpieza-dental', 'ortodoncia'],
      horarioPorDia: {
        1: { abre: '09:00', cierra: '18:00', activo: true },
      },
      citasAgendadas: [
        { inicio: '2026-11-09T09:00:00', fin: '2026-11-09T10:00:00' },
        { inicio: '2026-11-09T10:00:00', fin: '2026-11-09T11:00:00' },
      ],
      maxCitasDiarias: 4,
    },
    {
      id: 'esp-laura',
      nombre: 'Dra. Laura Morales',
      activo: false, // Inactiva
      serviciosHabilitados: ['limpieza-dental'],
    },
  ];

  describe('filtrarCapacitados', () => {
    it('filtra solo especialistas activos capacitados en el servicio', () => {
      const capacitados = MotorAsignacionEspecialistas.filtrarCapacitados('limpieza-dental', staff);
      expect(capacitados.map((e) => e.id)).toEqual(['esp-ana', 'esp-carlos']);
      expect(capacitados.some((e) => e.id === 'esp-laura')).toBe(false);
    });

    it('retorna vacío si ningún especialista posee la certificación del servicio', () => {
      const capacitados = MotorAsignacionEspecialistas.filtrarCapacitados('cirugia-maxilofacial', staff);
      expect(capacitados).toHaveLength(0);
    });
  });

  describe('verificarDisponibilidadSlot', () => {
    it('rechaza si el horario está fuera de la jornada del especialista', () => {
      const ok = MotorAsignacionEspecialistas.verificarDisponibilidadSlot(
        staff[0]!,
        '2026-11-09',
        '08:00', // Abre a las 09:00
        60
      );
      expect(ok).toBe(false);
    });

    it('rechaza cuando existe colisión con una cita agendada', () => {
      const ok = MotorAsignacionEspecialistas.verificarDisponibilidadSlot(
        staff[0]!,
        '2026-11-09',
        '10:30', // Colisiona con 10:00 - 11:00
        30
      );
      expect(ok).toBe(false);
    });

    it('aprueba cuando el horario está libre y dentro de jornada', () => {
      const ok = MotorAsignacionEspecialistas.verificarDisponibilidadSlot(
        staff[0]!,
        '2026-11-09',
        '11:00', // Libre
        45
      );
      expect(ok).toBe(true);
    });

    it('ignora citas canceladas que liberaron el horario', () => {
      const espConCancelada: Especialista = {
        ...staff[0]!,
        citasAgendadas: [
          { inicio: '2026-11-09T10:00:00', fin: '2026-11-09T11:00:00', estado: 'cancelada' },
        ],
      };
      const ok = MotorAsignacionEspecialistas.verificarDisponibilidadSlot(
        espConCancelada,
        '2026-11-09',
        '10:00',
        60
      );
      expect(ok).toBe(true);
    });

    it('respeta el límite de maxCitasDiarias', () => {
      const espLleno: Especialista = {
        ...staff[0]!,
        maxCitasDiarias: 1,
        citasAgendadas: [
          { inicio: '2026-11-09T09:00:00', fin: '2026-11-09T10:00:00' },
        ],
      };
      const ok = MotorAsignacionEspecialistas.verificarDisponibilidadSlot(
        espLleno,
        '2026-11-09',
        '14:00',
        60
      );
      expect(ok).toBe(false);
    });
  });

  describe('asignar con estrategias', () => {
    it('asigna al especialista preferido por el cliente si está disponible', () => {
      const solicitud: SolicitudAsignacionEspecialista = {
        servicioId: 'limpieza-dental',
        fecha: '2026-11-09',
        horaInicio: '11:00',
        duracionMin: 45,
        especialistaPreferidoId: 'esp-ana',
        estrategia: 'PREFERENCIA_CLIENTE',
      };

      const resultado = MotorAsignacionEspecialistas.asignar(solicitud, staff);
      expect(resultado.asignado).toBe(true);
      expect(resultado.especialistaId).toBe('esp-ana');
      expect(resultado.especialistaNombre).toBe('Dra. Ana López');
    });

    it('aplica fallback automático a otro especialista disponible si el preferido colisiona', () => {
      const solicitud: SolicitudAsignacionEspecialista = {
        servicioId: 'limpieza-dental',
        fecha: '2026-11-09',
        horaInicio: '10:00', // Ana está ocupada a las 10:00, Carlos también
        duracionMin: 30,
        especialistaPreferidoId: 'esp-ana',
      };

      const resultado = MotorAsignacionEspecialistas.asignar(solicitud, staff);
      expect(resultado.asignado).toBe(false);
      expect(resultado.motivoRechazo).toContain('colisión de horario');
    });

    it('balancea por MENOR_CARGA seleccionando al especialista con menos citas asignadas', () => {
      const solicitud: SolicitudAsignacionEspecialista = {
        servicioId: 'limpieza-dental',
        fecha: '2026-11-09',
        horaInicio: '14:00', // Ambos libres a las 14:00
        duracionMin: 60,
        estrategia: 'MENOR_CARGA',
      };

      // Ana tiene 1 cita hoy; Carlos tiene 2 citas hoy
      const resultado = MotorAsignacionEspecialistas.asignar(solicitud, staff);
      expect(resultado.asignado).toBe(true);
      expect(resultado.especialistaId).toBe('esp-ana'); // Ana tiene menor carga
      expect(resultado.alternativasDisponibles.some((a) => a.especialistaId === 'esp-carlos')).toBe(true);
    });

    it('optimiza por MAXIMA_EFICIENCIA compactando agenda adyacente a cita previa', () => {
      const solicitud: SolicitudAsignacionEspecialista = {
        servicioId: 'limpieza-dental',
        fecha: '2026-11-09',
        horaInicio: '11:00', // Carlos termina cita a las 11:00 (gap 0); Ana también termina a las 11:00
        duracionMin: 60,
        estrategia: 'MAXIMA_EFICIENCIA',
      };

      const resultado = MotorAsignacionEspecialistas.asignar(solicitud, staff);
      expect(resultado.asignado).toBe(true);
      expect(resultado.especialistaId).toBeDefined();
    });

    it('rechaza ordenadamente cuando ningún especialista cuenta con el servicio solicitado', () => {
      const solicitud: SolicitudAsignacionEspecialista = {
        servicioId: 'servicio-inexistente',
        fecha: '2026-11-09',
        horaInicio: '11:00',
        duracionMin: 30,
      };

      const resultado = MotorAsignacionEspecialistas.asignar(solicitud, staff);
      expect(resultado.asignado).toBe(false);
      expect(resultado.candidatosAptosCount).toBe(0);
      expect(resultado.motivoRechazo).toContain('No hay especialistas capacitados');
    });
  });
});
