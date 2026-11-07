import {
  AsignacionEspecialistaResultado,
  Especialista,
  MotorAsignacionEspecialistas,
  SolicitudAsignacionEspecialista,
} from '../asignacionEspecialistas';

export interface AsignarEspecialistaOptimoCommand {
  readonly negocioId: string;
  readonly solicitud: SolicitudAsignacionEspecialista;
  readonly especialistas: readonly Especialista[];
}

export class AsignarEspecialistaOptimoUseCase {
  public execute(command: AsignarEspecialistaOptimoCommand): AsignacionEspecialistaResultado {
    const { solicitud, especialistas } = command;

    if (!solicitud.servicioId || solicitud.servicioId.trim().length === 0) {
      throw new Error('El servicioId es obligatorio para la asignación de especialista.');
    }

    if (solicitud.duracionMin <= 0) {
      throw new Error('La duración del servicio debe ser mayor a 0 minutos.');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(solicitud.fecha)) {
      throw new Error('La fecha debe tener formato YYYY-MM-DD.');
    }

    if (!/^\d{2}:\d{2}$/.test(solicitud.horaInicio)) {
      throw new Error('La hora de inicio debe tener formato HH:MM.');
    }

    return MotorAsignacionEspecialistas.asignar(solicitud, especialistas);
  }
}
