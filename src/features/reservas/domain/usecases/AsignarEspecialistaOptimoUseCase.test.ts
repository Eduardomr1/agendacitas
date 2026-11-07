import { describe, expect, it } from 'vitest';
import { Especialista } from '../asignacionEspecialistas';
import { AsignarEspecialistaOptimoUseCase } from './AsignarEspecialistaOptimoUseCase';

describe('AsignarEspecialistaOptimoUseCase', () => {
  const useCase = new AsignarEspecialistaOptimoUseCase();

  const especialistas: Especialista[] = [
    {
      id: 'esp-1',
      nombre: 'Dr. Valenzuela',
      activo: true,
      serviciosHabilitados: ['consulta-general'],
      citasAgendadas: [],
    },
  ];

  it('valida argumentos obligatorios y rechaza formato de fecha incorrecto', () => {
    expect(() =>
      useCase.execute({
        negocioId: 'biz-1',
        solicitud: {
          servicioId: '',
          fecha: '2026-11-09',
          horaInicio: '10:00',
          duracionMin: 30,
        },
        especialistas,
      })
    ).toThrow('El servicioId es obligatorio');

    expect(() =>
      useCase.execute({
        negocioId: 'biz-1',
        solicitud: {
          servicioId: 'consulta-general',
          fecha: '09/11/2026', // Formato inválido
          horaInicio: '10:00',
          duracionMin: 30,
        },
        especialistas,
      })
    ).toThrow('YYYY-MM-DD');
  });

  it('ejecuta exitosamente la asignación cuando los datos son conformes', () => {
    const res = useCase.execute({
      negocioId: 'biz-1',
      solicitud: {
        servicioId: 'consulta-general',
        fecha: '2026-11-09',
        horaInicio: '10:00',
        duracionMin: 30,
      },
      especialistas,
    });

    expect(res.asignado).toBe(true);
    expect(res.especialistaId).toBe('esp-1');
    expect(res.especialistaNombre).toBe('Dr. Valenzuela');
  });
});
