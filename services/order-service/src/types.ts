import type { EstadoPedido, OrigenPedido, Pedido, DetallePedido } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
};

export type ItemPedidoInput = {
  platillo_id: number;
  cantidad: number;
};

export type CrearPedidoInput = {
  cliente_id?: number | null;
  mesero_id?: number | null;
  mesa_id?: number | null;
  origen: OrigenPedido;
  observaciones?: string;
  items: ItemPedidoInput[];
  confirmado?: boolean;
};

export type PedidoConDetalles = Pedido & { detalles: DetallePedido[] };
