import type { EstadoPedido, Pedido } from '@restaurante/contract';

export type Props = {
  port: number;
  orderServiceUrl: string;
  tableServiceUrl: string;
  notificationServiceUrl: string;
  authToken?: string;
};
