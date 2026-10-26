import { ServiceClient } from '@restaurante/contract/http';
import type { Inventario } from '@restaurante/contract';

export type InventoryClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearInventoryClient(p: InventoryClientProps): InventoryClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new InventoryClient(client);
}

export class InventoryClient {
  constructor(private readonly client: ServiceClient) {}

  async listar(): Promise<{ inventario: Inventario[] }> {
    const res = await this.client.get('/api/inventory');
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar inventario falló');
    return res.body!;
  }

  async obtener(id: number): Promise<Inventario> {
    const res = await this.client.get<{ inventario: Inventario }>(`/api/inventory/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'obtener inventario falló');
    return res.body.inventario;
  }

  async bajosStock(): Promise<Inventario[]> {
    const res = await this.client.get<{ inventario: Inventario[] }>('/api/inventory/low');
    if (!res.ok) throw new Error((res.body?.error as string) || 'bajos stock falló');
    return res.body.inventario;
  }

  async registrar(dto: {
    nombre: string;
    unidad_medida?: string;
    cantidad_inicial?: number;
    cantidad_minima?: number;
    codigo_de_barras?: string;
  }): Promise<Inventario> {
    const res = await this.client.post<{ inventario: Inventario }>('/api/inventory', dto);
    if (!res.ok) throw new Error((res.body?.error as string) || 'registrar inventario falló');
    return res.body.inventario;
  }

  async actualizarCantidad(id: number, cantidadActual: number): Promise<Inventario> {
    const res = await this.client.put<{ inventario: Inventario }>(`/api/inventory/${id}`, { cantidad_actual: cantidadActual });
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualizar cantidad falló');
    return res.body.inventario;
  }

  async agregarStockPorCodigoBarras(codigoDeBarras: string, cantidad: number): Promise<Inventario> {
    const res = await this.client.post<{ inventario: Inventario }>('/api/inventory/agregar', { codigo_de_barras: codigoDeBarras, cantidad });
    if (!res.ok) throw new Error((res.body?.error as string) || 'agregar stock falló');
    return res.body.inventario;
  }
}
