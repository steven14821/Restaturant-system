import { ServiceClient } from '@restaurante/contract/http';
import type { Categoria, Platillo } from '@restaurante/contract';

export type MenuClientProps = {
  baseUrl: string;
  auth?: { token: string };
  soloAdmin?: boolean;
};

export function crearMenuClient(p: MenuClientProps): MenuClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new MenuClient(client, p.soloAdmin ?? false);
}

export class MenuClient {
  constructor(private readonly client: ServiceClient, private readonly soloAdmin: boolean) {}

  async listar(soloDisponibles = true, categoriaId?: number): Promise<{ platillos: Platillo[] }> {
    const res = await this.client.get('/api/menu', {
      disponibles: soloDisponibles ? 'true' : 'false',
      categoria_id: categoriaId,
    });
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar menú falló');
    return res.body!;
  }

  async obtener(id: number): Promise<Platillo> {
    const res = await this.client.get<{ platillo: Platillo }>(`/api/menu/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'obtener platillo falló');
    return res.body.platillo;
  }

  async crear(data: {
    nombre: string;
    descripcion?: string;
    precio: number;
    imagen_url?: string;
    disponible?: boolean;
    categoria_id?: number;
  }): Promise<Platillo> {
    const res = await this.client.post<{ platillo: Platillo }>('/api/menu', data);
    if (!res.ok) throw new Error((res.body?.error as string) || 'crear platillo falló');
    return res.body.platillo;
  }

  async actualizar(id: number, data: {
    nombre?: string;
    descripcion?: string;
    precio?: number;
    imagen_url?: string;
    categoria_id?: number;
  }): Promise<Platillo> {
    const res = await this.client.put<{ platillo: Platillo }>(`/api/menu/${id}`, data);
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualizar platillo falló');
    return res.body.platillo;
  }

  async alternarDisponibilidad(id: number): Promise<Platillo> {
    const res = await this.client.patch<{ platillo: Platillo }>(`/api/menu/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'alternar disponibilidad falló');
    return res.body.platillo;
  }

  async eliminar(id: number): Promise<void> {
    const res = await this.client.delete<{ message?: string }>(`/api/menu/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'eliminar platillo falló');
  }

  async listarCategorias(): Promise<{ categorias: Categoria[] }> {
    const res = await this.client.get('/api/categories');
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar categorías falló');
    return res.body!;
  }

  async crearCategoria(nombre: string, descripcion?: string): Promise<Categoria> {
    const res = await this.client.post<{ categoria: Categoria }>('/api/categories', { nombre, descripcion });
    if (!res.ok) throw new Error((res.body?.error as string) || 'crear categoría falló');
    return res.body.categoria;
  }
}
