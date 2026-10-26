import type { TipoNotificacion, Notificacion } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
};

export type CrearNotificacionDto = {
  usuario_id: number;
  pedido_id: number | null;
  tipo: TipoNotificacion;
  mensaje: string;
};
