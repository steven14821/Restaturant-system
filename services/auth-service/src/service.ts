import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import type { LoginDto, LoginResult, RegistroDto, GuestResult, MeResult, Props, Signer, Verifier } from './types.js';
import type { UsuarioPublico, TokenPayload } from '@restaurante/contract';

export function crearAuthService(p: Props): AuthService {
  return new AuthService(p);
}

export class AuthService {
  private readonly db: Pool;
  private readonly sign: Signer;
  private readonly verify: Verifier;

  constructor(p: Props) {
    this.db = p.db;
    this.sign = (payload) => jwt.sign(payload, p.jwtSecret, { expiresIn: p.jwtExpiresIn });
    this.verify = (token) => {
      try {
        return jwt.verify(token, p.jwtSecret) as unknown as TokenPayload;
      } catch {
        return null;
      }
    };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    if (!dto.email || !dto.password) {
      throw new Error('Credenciales inválidas.');
    }

    const row = await this.db.query<{ id:number; nombre:string; email:string; password_hash:string; rol:string; activo:boolean }>(
      `SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre as rol, u.activo
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
       WHERE u.email = $1 AND u.activo = true`,
      [dto.email.toLowerCase().trim()],
    );

    const usuario = row.rows[0];
    if (!usuario || usuario.password_hash !== dto.password) {
      throw new Error('Credenciales inválidas.');
    }

    const publico: UsuarioPublico = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol as UsuarioPublico['rol'],
      activo: usuario.activo,
    };

    return { usuario: publico, token: this.sign({ sub: usuario.id, email: usuario.email, rol: publico.rol, nombre: usuario.nombre }) };
  }

  async registro(dto: RegistroDto): Promise<UsuarioPublico> {
    if (!dto.nombre || !dto.email || !dto.password) {
      throw new Error('nombre, email y password son obligatorios.');
    }

    const rolRow = await this.db.query<{ id:number }>('SELECT id FROM rol WHERE nombre = $1', ['CLIENTE']);
    if (!rolRow.rows[0]) throw new Error('Rol CLIENTE no encontrado.');

    const existing = await this.db.query<{ id:number }>('SELECT id FROM usuario WHERE lower(email) = $1', [dto.email.toLowerCase().trim()]);
    if (existing.rows[0]) throw new Error('El email ya está registrado.');

    const id = await this.db.query<{ id:number }>(
      `INSERT INTO usuario (nombre, email, password_hash, rol_id, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [dto.nombre.trim(), dto.email.toLowerCase().trim(), dto.password, rolRow.rows[0].id],
    );

    return {
      id: id.rows[0].id,
      nombre: dto.nombre.trim(),
      email: dto.email.toLowerCase().trim(),
      rol: 'CLIENTE',
      activo: true,
    };
  }

  async guest(): Promise<GuestResult> {
    const publico: UsuarioPublico = { id: 0, nombre: 'Invitado', email: '', rol: 'INVITADO', activo: true };
    return { usuario: publico, token: this.sign({ sub: 0, email: '', rol: 'INVITADO', nombre: 'Invitado' }) };
  }

  async me(sub: number): Promise<MeResult> {
    if (sub === 0) {
      return { usuario: { id: 0, nombre: 'Invitado', email: '', rol: 'INVITADO', activo: true } };
    }

    const row = await this.db.query<{ id:number; nombre:string; email:string; rol:string; activo:boolean }>(
      `SELECT u.id, u.nombre, u.email, r.nombre as rol, u.activo
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [sub],
    );

    if (!row.rows[0]) throw new Error('Usuario no encontrado.');

    const usuario = row.rows[0];
    return {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol as UsuarioPublico['rol'],
        activo: usuario.activo,
      },
    };
  }

  verifyToken(token: string): TokenPayload | null {
    return this.verify(token);
  }
}
