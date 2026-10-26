import { Pool } from 'pg';
import type { Categoria, Platillo } from '@restaurante/contract';
import type { CrearPlatilloDto, EditarPlatilloDto, CrearCategoriaDto, Props } from './types.js';

export function crearMenuService(p: Props): MenuService {
  return new MenuService(p);
}

export class MenuService {
  private readonly db: Pool;

  constructor(p: Props) {
    this.db = p.db;
  }

  async listarPlatillos(opts: { soloDisponibles?: boolean; categoriaId?: number } = {}): Promise<Platillo[]> {
    let query = `
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
             p.disponible, p.categoria_id, c.nombre as categoria_nombre
      FROM platillo p
      LEFT JOIN categoria c ON c.id = p.categoria_id
      WHERE 1 = 1`;
    const params: unknown[] = [];

    if (opts.soloDisponibles !== false) {
      query += ' AND p.disponible = true';
    }
    if (opts.categoriaId) {
      query += ' AND p.categoria_id = $1';
      params.push(opts.categoriaId);
    }

    query += ' ORDER BY c.nombre, p.nombre';

    const rows = await this.db.query<Platillo>(query, params);
    return rows.rows.map((r) => ({
      ...r,
      disponible: Boolean(r.disponible),
    }));
  }

  async obtener(id: number): Promise<Platillo> {
    const row = await this.db.query<Platillo>(
      `SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
              p.disponible, p.categoria_id, c.nombre as categoria_nombre
       FROM platillo p
       LEFT JOIN categoria c ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [id],
    );
    if (!row.rows[0]) throw new Error('Platillo no encontrado.');
    return { ...row.rows[0], disponible: Boolean(row.rows[0].disponible) };
  }

  async crear(dto: CrearPlatilloDto): Promise<Platillo> {
    if (!dto.nombre || dto.precio === undefined) {
      throw new Error('nombre y precio son obligatorios.');
    }

    const id = await this.db.query<{ id:number }>(
      `INSERT INTO platillo (nombre, descripcion, precio, imagen_url, disponible, categoria_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        dto.nombre.trim(),
        dto.descripcion ?? null,
        dto.precio,
        dto.imagen_url ?? null,
        dto.disponible !== false ? 1 : 0,
        dto.categoria_id ?? null,
      ],
    );

    return this.obtener(id.rows[0].id);
  }

  async actualizar(id: number, dto: EditarPlatilloDto): Promise<Platillo> {
    const exists = await this.db.query<{ id:number }>('SELECT id FROM platillo WHERE id = $1', [id]);
    if (!exists.rows[0]) throw new Error('Platillo no encontrado.');

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (dto.nombre !== undefined) { sets.push(`nombre = $${i++}`); params.push(dto.nombre.trim()); }
    if (dto.descripcion !== undefined) { sets.push(`descripcion = $${i++}`); params.push(dto.descripcion ?? null); }
    if (dto.precio !== undefined) { sets.push(`precio = $${i++}`); params.push(dto.precio); }
    if (dto.imagen_url !== undefined) { sets.push(`imagen_url = $${i++}`); params.push(dto.imagen_url ?? null); }
    if (dto.categoria_id !== undefined) { sets.push(`categoria_id = $${i++}`); params.push(dto.categoria_id ?? null); }

    if (sets.length === 0) throw new Error('No hay campos para actualizar.');

    params.push(id);
    await this.db.query(`UPDATE platillo SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`, params);
    return this.obtener(id);
  }

  async alternarDisponibilidad(id: number): Promise<Platillo> {
    const actual = await this.db.query<{ disponible:boolean }>('SELECT disponible FROM platillo WHERE id = $1', [id]);
    if (!actual.rows[0]) throw new Error('Platillo no encontrado.');
    const nuevo = actual.rows[0].disponible ? 0 : 1;
    await this.db.query(`UPDATE platillo SET disponible = $1, updated_at = NOW() WHERE id = $2`, [nuevo, id]);
    return this.obtener(id);
  }

  async eliminar(id: number): Promise<void> {
    const existing = await this.db.query<{ id:number }>('SELECT id FROM platillo WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new Error('Platillo no encontrado.');
    await this.db.query('DELETE FROM platillo WHERE id = $1', [id]);
  }

  async listarCategorias(): Promise<Categoria[]> {
    const rows = await this.db.query<Categoria>('SELECT id, nombre, descripcion FROM categoria ORDER BY nombre');
    return rows.rows;
  }

  async crearCategoria(dto: CrearCategoriaDto): Promise<Categoria> {
    if (!dto.nombre) throw new Error('El nombre de la categoría es obligatorio.');
    const row = await this.db.query<Categoria>(
      `INSERT INTO categoria (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id, nombre, descripcion`,
      [dto.nombre.trim(), dto.descripcion ?? null],
    );
    return row.rows[0];
  }
}
