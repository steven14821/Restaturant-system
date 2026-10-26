import type { RolNombre, Persona, UsuarioPublico } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
  bcryptRounds: number;
};

export type CrearUsuarioDto = {
  nombre: string;
  email: string;
  password: string;
  rol: RolNombre;
};

export type EditarUsuarioDto = Partial<{
  nombre: string;
  email: string;
  password: string;
  rol: RolNombre;
  activo: boolean;
}>;

export type UsuarioConRol = Persona & { rol_nombre: RolNombre };
