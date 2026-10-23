import { describe, expect, it } from 'vitest';
import {
  detectarDuplicadoListaEspera,
  obtenerFranjaDeHora,
  seleccionarCandidatosListaEspera,
  validarEntradaListaEspera,
  type EntradaListaEspera,
  type HuecoLiberado,
  type NuevaEntradaListaEsperaInput,
} from './listaEspera';

describe('validarEntradaListaEspera', () => {
  const entradaValida: NuevaEntradaListaEsperaInput = {
    negocioId: 'negocio-1',
    servicioId: 'servicio-corte',
    clienteNombre: 'Carlos Mendez',
    clienteEmail: 'carlos@example.com',
    fechaDeseada: '2026-11-15',
    franjaPreferida: 'tarde',
    duracionRequeridaMin: 45,
    prioridadManual: 1,
  };

  it('valida correctamente un input completo y congruente', () => {
    const res = validarEntradaListaEspera(entradaValida);
    expect(res.valido).toBe(true);
    expect(res.errores).toHaveLength(0);
  });

  it('rechaza negocioId o servicioId vacio', () => {
    const res = validarEntradaListaEspera({
      ...entradaValida,
      negocioId: '   ',
      servicioId: '',
    });
    expect(res.valido).toBe(false);
    expect(res.errores).toContain('El identificador del negocio es obligatorio.');
    expect(res.errores).toContain('El identificador del servicio es obligatorio.');
  });

  it('rechaza nombres de cliente demasiado cortos o emails invalidos', () => {
    const res = validarEntradaListaEspera({
      ...entradaValida,
      clienteNombre: 'A',
      clienteEmail: 'correo-sin-arroba',
    });
    expect(res.valido).toBe(false);
    expect(res.errores).toContain('El nombre del cliente debe contener al menos 2 caracteres.');
    expect(res.errores).toContain('El correo electrónico del cliente no es válido.');
  });

  it('rechaza duracion no positiva o fecha no valida', () => {
    const res = validarEntradaListaEspera({
      ...entradaValida,
      duracionRequeridaMin: 0,
      fechaDeseada: '2026-02-31',
    });
    expect(res.valido).toBe(false);
    expect(res.errores).toContain('La duración requerida del servicio debe ser mayor a 0 minutos.');
    expect(res.errores).toContain('La fecha deseada debe tener un formato YYYY-MM-DD válido.');
  });

  it('valida congruencia de rango horario preferido', () => {
    const resRangoCorto = validarEntradaListaEspera({
      ...entradaValida,
      duracionRequeridaMin: 60,
      rangoHorarioPreferido: { inicio: '14:00', fin: '14:30' },
    });
    expect(resRangoCorto.valido).toBe(false);
    expect(resRangoCorto.errores).toContain(
      'El rango horario preferido es más corto que la duración requerida del servicio.',
    );
  });
});

describe('obtenerFranjaDeHora', () => {
  it('clasifica horas en manana, tarde y noche', () => {
    expect(obtenerFranjaDeHora('09:30')).toBe('manana');
    expect(obtenerFranjaDeHora('11:59')).toBe('manana');
    expect(obtenerFranjaDeHora('12:00')).toBe('tarde');
    expect(obtenerFranjaDeHora('15:45')).toBe('tarde');
    expect(obtenerFranjaDeHora('18:00')).toBe('noche');
    expect(obtenerFranjaDeHora('21:15')).toBe('noche');
  });
});

describe('detectarDuplicadoListaEspera', () => {
  const existentes: EntradaListaEspera[] = [
    {
      id: 'wait-1',
      negocioId: 'barberia-centro',
      servicioId: 'corte-fade',
      clienteNombre: 'Ana Perez',
      clienteEmail: 'ana.perez@example.com',
      fechaDeseada: '2026-11-20',
      franjaPreferida: 'manana',
      duracionRequeridaMin: 30,
      creadaEn: new Date('2026-11-01T10:00:00Z'),
      estado: 'activa',
    },
    {
      id: 'wait-2',
      negocioId: 'barberia-centro',
      servicioId: 'corte-fade',
      clienteNombre: 'Luis Gomez',
      clienteEmail: 'luis@example.com',
      fechaDeseada: '2026-11-20',
      franjaPreferida: 'tarde',
      duracionRequeridaMin: 30,
      creadaEn: new Date('2026-11-01T11:00:00Z'),
      estado: 'cancelada',
    },
  ];

  it('detecta duplicado case-insensitive para mismo negocio, servicio y fecha con estado activo', () => {
    const esDup = detectarDuplicadoListaEspera(existentes, {
      negocioId: 'barberia-centro',
      servicioId: 'corte-fade',
      clienteEmail: 'ANA.PEREZ@example.com',
      fechaDeseada: '2026-11-20',
    });
    expect(esDup).toBe(true);
  });

  it('no marca duplicado si la entrada previa fue cancelada', () => {
    const esDup = detectarDuplicadoListaEspera(existentes, {
      negocioId: 'barberia-centro',
      servicioId: 'corte-fade',
      clienteEmail: 'luis@example.com',
      fechaDeseada: '2026-11-20',
    });
    expect(esDup).toBe(false);
  });
});

describe('seleccionarCandidatosListaEspera', () => {
  const baseHueco: HuecoLiberado = {
    negocioId: 'clinica-sur',
    servicioId: 'limpieza-dental',
    fecha: '2026-11-25',
    horaInicio: '10:00',
    horaFin: '11:00',
  };

  const c1: EntradaListaEspera = {
    id: 'cand-1',
    negocioId: 'clinica-sur',
    servicioId: 'limpieza-dental',
    clienteNombre: 'Elena Rios',
    clienteEmail: 'elena@example.com',
    fechaDeseada: '2026-11-25',
    franjaPreferida: 'manana',
    duracionRequeridaMin: 45,
    prioridadManual: 0,
    creadaEn: new Date('2026-11-20T08:00:00Z'),
    estado: 'activa',
  };

  const c2Urgente: EntradaListaEspera = {
    id: 'cand-2',
    negocioId: 'clinica-sur',
    servicioId: 'limpieza-dental',
    clienteNombre: 'Roberto Sanz',
    clienteEmail: 'roberto@example.com',
    fechaDeseada: '2026-11-25',
    franjaPreferida: 'manana',
    duracionRequeridaMin: 45,
    prioridadManual: 2, // Urgente
    creadaEn: new Date('2026-11-21T10:00:00Z'), // Posterior a Elena, pero mayor prioridad
    estado: 'activa',
  };

  const c3NoCabe: EntradaListaEspera = {
    id: 'cand-3',
    negocioId: 'clinica-sur',
    servicioId: 'ortodoncia-completa',
    clienteNombre: 'Monica Soto',
    clienteEmail: 'monica@example.com',
    fechaDeseada: '2026-11-25',
    franjaPreferida: 'manana',
    duracionRequeridaMin: 90, // No cabe en 60 min
    creadaEn: new Date('2026-11-19T08:00:00Z'),
    estado: 'activa',
  };

  it('prioriza candidatos por puntaje ponderado (prioridad operativa y coincidencia de servicio)', () => {
    const seleccion = seleccionarCandidatosListaEspera(baseHueco, [c1, c2Urgente, c3NoCabe]);
    expect(seleccion).toHaveLength(2);
    // Roberto Sanz tiene prioridad manual 2 (60 pts) vs Elena 0 pts
    expect(seleccion[0]?.entrada.id).toBe('cand-2');
    expect(seleccion[0]?.horaInicioSugerida).toBe('10:00');
    expect(seleccion[0]?.horaFinSugerida).toBe('10:45');
    expect(seleccion[1]?.entrada.id).toBe('cand-1');
  });

  it('descarta candidatos que exceden el hueco disponible', () => {
    const seleccion = seleccionarCandidatosListaEspera(baseHueco, [c3NoCabe]);
    expect(seleccion).toHaveLength(0);
  });

  it('respeta el limite maximo de candidatos si se especifica', () => {
    const seleccion = seleccionarCandidatosListaEspera(
      baseHueco,
      [c1, c2Urgente],
      { limiteCandidatos: 1 },
    );
    expect(seleccion).toHaveLength(1);
    expect(seleccion[0]?.entrada.id).toBe('cand-2');
  });
});
