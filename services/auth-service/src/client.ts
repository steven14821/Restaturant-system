import { ServiceClient } from '@restaurante/contract/http';
import type { UsuarioPublico, AuthSession, MeResult } from '@restaurante/contract';
import type { GuestResult } from './types.js';

export type AuthClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearAuthClient(p: AuthClientProps): AuthClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new AuthClient(client);
}

export class AuthClient {
  constructor(private readonly client: ServiceClient) {}

  async guest(): Promise<GuestResult> {
    const res = await this.client.post<GuestResult>('/api/auth/guest');
    if (!res.ok) throw new Error((res.body?.error as string) || 'guest falló');
    return res.body as GuestResult;
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const res = await this.client.post<AuthSession>('/api/auth/login', { email, password });
    if (!res.ok) throw new Error((res.body?.error as string) || 'login falló');
    return res.body as AuthSession;
  }

  async register(nombre: string, email: string, password: string): Promise<UsuarioPublico> {
    const res = await this.client.post<{ usuario: UsuarioPublico }>('/api/auth/register', { nombre, email, password });
    if (!res.ok) throw new Error((res.body?.error as string) || 'register falló');
    return res.body.usuario;
  }

  async me(): Promise<MeResult> {
    const res = await this.client.get<MeResult>('/api/auth/me');
    if (!res.ok) throw new Error((res.body?.error as string) || 'me falló');
    return res.body!;
  }
}
