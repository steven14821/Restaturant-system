import { ServiceClient } from '@restaurante/contract/http';
import type { EstadoPedido, PedidoConDetalles } from '@restaurante/contract';

export type OrderClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearOrderClient(p: OrderClientProps): OrderClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new OrderClient(client);
}

export class OrderClient {
  constructor(private readonly client: ServiceClient) {}

  async listar(opts?: {
    clienteId?: number;
    estado?: EstadoPedido;
    mesaId?: number;
    meseroId?: number;
    confirmado?: boolean;
  }): Promise<{ pedidos: PedidoConDetalles[] }> {
    const res = await this.client.get('/api/orders', opts as Record<string, string | number | boolean | undefined>);
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar pedidos falló');
    return res.body!;
  }

  async obtener(id: number): Promise<PedidoConDetalles> {
    const res = await this.client.get<{ pedido: PedidoConDetalles }>(`/api/orders/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'obtener pedido falló');
    return res.body.pedido;
  }

  async crear(body: import('./types.js').CrearPedidoInput): Promise<PedidoConDetalles> {
    const res = await this.client.post<{ pedido: PedidoConDetalles }>('/api/orders', body);
    if (!res.ok) throw new Error((res.body?.error as string) || 'crear pedido falló');
    return res.body.pedido;
  }

  async actualizar(id: number, items: import('./types.js').ItemPedidoInput[], observaciones?: string): Promise<PedidoConDetalles> {
    const res = await this.client.put<{ pedido: PedidoConDetalles }>(`/api/orders/${id}`, { items, observaciones });
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualizar pedido falló');
    return res.body.pedido;
  }

  async cancelar(id: number): Promise<PedidoConDetalles> {
    const res = await this.client.delete<{ pedido: PedidoConDetalles }>(`/api/orders/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'cancelar pedido falló');
    return res.body.pedido;
  }

  async confirmar(id: number): Promise<PedidoConDetalles> {
    const res = await this.client.post<{ pedido: PedidoConDetalles }>(`/api/orders/${id}/confirm`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'confirmar pedido falló');
    return res.body.pedido;
  }

  async actualizarEstado(id: number, estado: EstadoPedido): Promise<PedidoConDetalles> {
    const res = await this.client.patch<{ pedido: PedidoConDetalles }>(`/api/orders/${id}/status`, { estado });
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualizar estado falló');
    return res.body.pedido;
  }

  async repetir(pedidoId: number, clienteId: number): Promise<PedidoConDetalles> {
    const res = await this.client.post<{ pedido: PedidoConDetalles }>(`/api/orders/${pedidoId}/repeat`, { clienteId });
    if (!res.ok) throw new Error((res.body?.error as string) || 'repetir pedido falló');
    return res.body.pedido;
  }

  async pedidosCocina(): Promise<PedidoConDetalles[]> {
    const res = await this.client.get<{ pedidos: PedidoConDetalles[] }>('/api/orders/cocina');
    if (!res.ok) throw new Error((res.body?.error as string) || 'pedidos cocina falló');
    return res.body.pedidos;
  }

  async historialCliente(clienteId: number): Promise<PedidoConDetalles[]> {
    const res = await this.client.get<{ pedidos: PedidoConDetalles[] }>(`/api/orders/client/history/${clienteId}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'historial cliente falló');
    return res.body.pedidos;
  }
}
