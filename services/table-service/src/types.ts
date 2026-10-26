import type { EstadoMesa, Mesa } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
};

export type CrearMesaDto = {
  numero: number;
  capacidad: number;
};
