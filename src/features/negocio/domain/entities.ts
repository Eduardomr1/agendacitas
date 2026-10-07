export interface NegocioConfig {
  id: string;
  ownerId: string;
  slug: string;
  nombre: string;
  zonaHoraria: string;
}

export interface ActualizarNegocioInput {
  nombre: string;
  slug: string;
  zonaHoraria: string;
}
