import { ServiceClient } from '@restaurante/contract/http';
import type { Mesa, EstadoMesa } from '@restaurante/contract';

export type TableClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearTableClient(p: TableClientProps): TableClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new TableClient(client);
}

export class TableClient {
  constructor(private readonly client: ServiceClient) {}

  async listar(): Promise<{ mesas: Mesa[] }> {
    const res = await this.client.get('/api/tables');
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar mesas falló');
    return res.body!;
  }

  async obtener(id: number): Promise<Mesa> {
    const res = await this.client.get<{ mesa: Mesa }>(`/api/tables/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'obtener mesa falló');
    return res.body.mesa;
  }

  async buscarPorNumero(numero: number): Promise<Mesa> {
    const res = await this.client.get<{ mesa: Mesa }>(`/api/tables/by-number/${numero}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'buscar mesa falló');
    return res.body.mesa;
  }

  async crear(numero: number, capacidad = 4): Promise<Mesa> {
    const res = await this.client.post<{ mesa: Mesa }>('/api/tables', { numero, capacidad });
    if (!res.ok) throw new Error((res.body?.error as string) || 'crear mesa falló');
    return res.body.mesa;
  }

  async actualizarEstado(id: number, estado: EstadoMesa): Promise<Mesa> {
    const res = await this.client.put<{ mesa: Mesa }>(`/api/tables/${id}`, { estado });
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualizar estado de mesa falló');
    return res.body.mesa;
  }
}
