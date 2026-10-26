import { ServiceClient, ServiceAuth } from '@restaurante/contract/http';
import type { RolNombre, UsuarioPublico, Persona } from '@restaurante/contract';

export type IdentityClientProps = {
  baseUrl: string;
  auth?: ServiceAuth;
};

export function crearIdentityClient(p: IdentityClientProps): IdentityClient {
  const client = new ServiceClient(p.baseUrl, p.auth);
  return new IdentityClient(client);
}

export class IdentityClient {
  constructor(private readonly client: ServiceClient) {}

  async listar(): Promise<{ usuarios: Persona[] }> {
    const res = await this.client.get('/api/users');
    if (!res.ok) throw new Error((res.body?.error as string) || 'listar usuarios falló');
    return res.body!;
  }

  async crear(nombre: string, email: string, password: string, rol: RolNombre): Promise<UsuarioPublico> {
    const res = await this.client.post<{ usuario: UsuarioPublico }>('/api/users', { nombre, email, password, rol });
    if (!res.ok) throw new Error((res.body?.error as string) || 'crear usuario falló');
    return res.body.usuario;
  }

  async obtener(id: number): Promise<UsuarioPublico> {
    const res = await this.client.get<{ usuario: UsuarioPublico }>(`/api/users/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'obtener usuario falló');
    return res.body.usuario;
  }

  async actualizar(id: number, data: Record<string, unknown>): Promise<UsuarioPublico> {
    const res = await this.client.put<{ usuario: UsuarioPublico }>(`/api/users/${id}`, data);
    if (!res.ok) throw new Error((res.body?.error as string) || 'actualizar usuario falló');
    return res.body.usuario;
  }

  async desactivar(id: number): Promise<UsuarioPublico> {
    const res = await this.client.delete<{ usuario: UsuarioPublico }>(`/api/users/${id}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'desactivar usuario falló');
    return res.body.usuario;
  }

  async roles(): Promise<{ roles: { id:number; nombre:RolNombre; descripcion?: string }[] }> {
    const res = await this.client.get('/api/users/roles');
    if (!res.ok) throw new Error((res.body?.error as string) || 'roles falló');
    return res.body!;
  }

  async buscarPorRol(rol: RolNombre): Promise<Persona[]> {
    const res = await this.client.get<{ usuarios: Persona[] }>(`/api/users/by-role/${rol}`);
    if (!res.ok) throw new Error((res.body?.error as string) || 'buscar por rol falló');
    return res.body.usuarios;
  }
}
