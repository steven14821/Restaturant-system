import type { UsuarioPublico, TokenPayload } from '@restaurante/contract';
export type Props = {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  db: import('pg').Pool;
};
export type LoginDto = {
  email: string;
  password: string;
};
export type LoginResult = { usuario: UsuarioPublico; token: string };
export type RegistroDto = {
  nombre: string;
  email: string;
  password: string;
};
export type GuestResult = { usuario: UsuarioPublico; token: string };
export type MeResult = { usuario: UsuarioPublico };
export type Signer = (payload: TokenPayload) => string;
export type Verifier = (token: string) => TokenPayload | null;
export type AuthSession = { usuario: UsuarioPublico; token: string };
