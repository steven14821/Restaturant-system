import { ServiceClient } from '@restaurante/contract/http';
import type { Notificacion } from '@restaurante/contract';

export type NotificationClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearNotificationClient(p: NotificationClientProps): NotificationClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new NotificationClient(client);
}

export class NotificationClient {
  constructor(private readonly client: ServiceClient) {}

  async crear(usuarioId: number, pedidoId: number | null, tipo: string, mensaje: string): Promise<Notificacion> {
    const res = await this.client.post<{ notificacion: Notificacion }>('/api/notifications', { usuario_id: usuarioId, pedido_id: pedidoId, tipo, mensaje });
    if (!res.ok) throw new Error((res.body?.error as string) || 'crear notificación falló');
    return res.body.notificacion;
  }

  async listar(usuarioId: number, soloNoLeidas = false): Promise<Notificacion[]> {
    const res = await this.client.get<{ notificaciones: Notificacion[] }>('/api/notifications', {
      usuarioId,
      soloNoLeidas: String(soloNoLeidas),
    });
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar notificaciones falló');
    return res.body.notificaciones;
  }

  async marcarLeida(id: number, usuarioId: number): Promise<Notificacion | null> {
    const res = await this.client.patch<{ notificacion: Notificacion | null }>(`/api/notifications/${id}?usuarioId=${usuarioId}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'marcar leída falló');
    return res.body.notificacion;
  }

  async contarNoLeidas(usuarioId: number): Promise<number> {
    const res = await this.client.get<{ count: number }>(`/api/notifications/unread-count/${usuarioId}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'contar no leídas falló');
    return res.body.count;
  }
}
