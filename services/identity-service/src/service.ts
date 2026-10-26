import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import type { Persona, RolNombre, UsuarioPublico } from '@restaurante/contract';
import type { CrearUsuarioDto, EditarUsuarioDto, Props, UsuarioConRol } from './types.js';

export function crearIdentityService(p: Props): IdentityService {
  return new IdentityService(p);
}

export class IdentityService {
  private readonly db: Pool;
  private readonly bcryptRounds: number;

  constructor(p: Props) {
    this.db = p.db;
    this.bcryptRounds = p.bcryptRounds;
  }

  async listar(): Promise<Persona[]> {
    const rows = await this.db.query<{ id:number; nombre:string; email:string; rol:string; activo:boolean }>(
      `SELECT u.id, u.nombre, u.email, r.nombre as rol, u.activo
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
       ORDER BY u.id`,
    );
    return rows.rows.map((r) => ({ id: r.id, nombre: r.nombre, email: r.email, rol: r.rol as RolNombre, activo: r.activo }));
  }

  async crear(dto: CrearUsuarioDto): Promise<UsuarioPublico> {
    if (!dto.nombre || !dto.email || !dto.password || !dto.rol) {
      throw new Error('nombre, email, password y rol son obligatorios.');
    }

    const emailNorm = dto.email.toLowerCase().trim();
    const existing = await this.db.query<{ id:number }>('SELECT id FROM usuario WHERE lower(email) = $1', [emailNorm]);
    if (existing.rows[0]) throw new Error('El email ya está registrado.');

    const rolRow = await this.db.query<{ id:number }>('SELECT id FROM rol WHERE nombre = $1', [dto.rol]);
    if (!rolRow.rows[0]) throw new Error(`Rol "${dto.rol}" no existe.`);

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);
    const id = await this.db.query<{ id:number }>(
      `INSERT INTO usuario (nombre, email, password_hash, rol_id, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [dto.nombre.trim(), emailNorm, passwordHash, rolRow.rows[0].id],
    );

    return {
      id: id.rows[0].id,
      nombre: dto.nombre.trim(),
      email: emailNorm,
      rol: dto.rol,
      activo: true,
    };
  }

  async obtener(id: number): Promise<UsuarioPublico & { password_hash?: string }> {
    const row = await this.db.query<{ id:number; nombre:string; email:string; password_hash:string; rol:string; activo:boolean }>(
      `SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre as rol, u.activo
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [id],
    );
    if (!row.rows[0]) throw new Error('Usuario no encontrado.');
    const r = row.rows[0];
    return {
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      password_hash: r.password_hash,
      rol: r.rol as RolNombre,
      activo: r.activo,
    };
  }

  async actualizar(id: number, dto: EditarUsuarioDto): Promise<UsuarioPublico> {
    const exists = await this.db.query<{ id:number }>('SELECT id FROM usuario WHERE id = $1', [id]);
    if (!exists.rows[0]) throw new Error('Usuario no encontrado.');

    if (dto.email) {
      const emailNorm = dto.email.toLowerCase().trim();
      const Conflict = await this.db.query<{ id:number }>('SELECT id FROM usuario WHERE lower(email) = $1 AND id != $2', [emailNorm, id]);
      if (Conflict.rows[0]) throw new Error('El email ya está registrado.');
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (dto.nombre !== undefined) { sets.push(`nombre = $${i++}`); params.push(dto.nombre.trim()); }
    if (dto.email !== undefined) { sets.push(`email = $${i++}`); params.push(dto.email.toLowerCase().trim()); }
    if (dto.password !== undefined) { sets.push(`password_hash = $${i++}`); params.push(await bcrypt.hash(dto.password, this.bcryptRounds)); }
    if (dto.rol !== undefined) {
      const rolRow = await this.db.query<{ id:number }>('SELECT id FROM rol WHERE nombre = $1', [dto.rol]);
      if (!rolRow.rows[0]) throw new Error(`Rol "${dto.rol}" no existe.`);
      sets.push(`rol_id = $${i++}`); params.push(rolRow.rows[0].id);
    }
    if (dto.activo !== undefined) { sets.push(`activo = $${i++}`); params.push(dto.activo ? 1 : 0); }

    if (sets.length === 0) throw new Error('No hay campos para actualizar.');

    params.push(id);
    await this.db.query(`UPDATE usuario SET ${sets.join(', ')} WHERE id = $${i}`, params);

    return this.obtenerPublico(id);
  }

  async desactivar(id: number): Promise<UsuarioPublico> {
    return this.actualizar(id, { activo: false });
  }

  async roles(): Promise<{ id:number; nombre:RolNombre; descripcion?: string }[]> {
    const rows = await this.db.query<{ id:number; nombre:string; descripcion:string | null }>('SELECT id, nombre, descripcion FROM rol ORDER BY id');
    return rows.rows.map((r) => ({ id: r.id, nombre: r.nombre as RolNombre, descripcion: r.descripcion || undefined }));
  }

  async buscarPorRol(rol: RolNombre): Promise<Persona[]> {
    const rows = await this.db.query<{ id:number; nombre:string; email:string; activo:boolean }>(
      `SELECT u.id, u.nombre, u.email, u.activo
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
       WHERE r.nombre = $1 AND u.activo = true
       ORDER BY u.id`,
      [rol],
    );
    return rows.rows.map((r) => ({ id: r.id, nombre: r.nombre, email: r.email, rol, activo: r.activo }));
  }

  private async obtenerPublico(id: number): Promise<UsuarioPublico> {
    const row = await this.db.query<{ id:number; nombre:string; email:string; rol:string; activo:boolean }>(
      `SELECT u.id, u.nombre, u.email, r.nombre as rol, u.activo
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [id],
    );
    if (!row.rows[0]) throw new Error('Usuario no encontrado.');
    const r = row.rows[0];
    return { id: r.id, nombre: r.nombre, email: r.email, rol: r.rol as RolNombre, activo: r.activo };
  }
}
