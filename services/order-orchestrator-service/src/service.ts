import { ServiceClient } from '@restaurante/contract/http';
import type { EstadoPedido, Pedido } from '@restaurante/contract';
import type { Props } from './types.js';

export function crearOrchestrator(p: Props): Orchestrator {
  const client = new ServiceClient(p.orderServiceUrl, p.authToken ? { token: p.authToken, tipo: 'bearer' } : undefined);
  const tables = new ServiceClient(p.tableServiceUrl, p.authToken ? { token: p.authToken, tipo: 'bearer' } : undefined);
  const notifications = new ServiceClient(p.notificationServiceUrl, p.authToken ? { token: p.authToken, tipo: 'bearer' } : undefined);
  return new Orchestrator(client, tables, notifications, p.authToken);
}

export class Orchestrator {
  constructor(
    private readonly orders: ServiceClient,
    private readonly tables: ServiceClient,
    private readonly notifications: ServiceClient,
    private readonly authToken?: string,
  ) {}

  async registrarPedidoDesdeMesero(
    mesaId: number,
    items: Array<{ platillo_id: number; cantidad: number }>,
    observaciones?: string,
    meseroId?: number,
    confirmado = false,
  ): Promise<Pedido> {
    const res = await this.orders.post('/api/orders', {
      mesa_id: mesaId,
      mesero_id: meseroId ?? null,
      origen: 'MESERO',
      observaciones,
      items,
      confirmado,
    });
    if (!res.ok) throw new Error((res.body?.error as string) || 'registro fallido');
    return res.body.pedido;
  }

  async registrarPedidoDesdeCliente(
    mesaId: number,
    items: Array<{ platillo_id: number; cantidad: number }>,
    observaciones?: string,
    clienteId?: number,
  ): Promise<Pedido> {
    const res = await this.orders.post('/api/orders', {
      mesa_id: mesaId,
      cliente_id: clienteId ?? null,
      origen: 'CLIENTE',
      observaciones,
      items,
    });
    if (!res.ok) throw new Error((res.body?.error as string) || 'registro fallido');
    return res.body.pedido;
  }

  async confirmarPedido(id: number): Promise<Pedido> {
    const res = await this.orders.post(`/api/orders/${id}/confirm`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'confirmación fallida');
    return res.body.pedido;
  }

  async escucharEstado(id: number): Promise<Pedido> {
    const res = await this.orders.get(`/api/orders/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'consulta fallida');
    return res.body.pedido;
  }

  async avanzarEstado(id: number, estado: EstadoPedido): Promise<Pedido> {
    const res = await this.orders.patch(`/api/orders/${id}/status`, { estado });
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualización fallida');
    return res.body.pedido;
  }

  async liberarMesaSiEsPosible(id: number): Promise<void> {
    const pedido = await this.escucharEstado(id);
    if (pedido.mesa_id) {
      const m = await this.tables.get<{ mesa: { id:number; estado:string } }>(`/api/tables/${pedido.mesa_id}`);
      if (m.ok && m.body?.mesa) {
        const activos = await this.orders.get('/api/orders', { mesa_id: m.body.mesa.id, estado: undefined as unknown as string });
        // Aquí iría lógica adicional si fuera necesario consultar por estado.
      }
    }
  }
}
