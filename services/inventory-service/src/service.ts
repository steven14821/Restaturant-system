import { Pool } from 'pg';
import type { Inventario } from '@restaurante/contract';
import type { RegistrarIngredienteDto, AgregarStockDto, Props } from './types.js';

export function crearInventoryService(p: Props): InventoryService {
  return new InventoryService(p);
}

export class InventoryService {
  private readonly db: Pool;

  constructor(p: Props) {
    this.db = p.db;
  }

  async listar(): Promise<Inventario[]> {
    const rows = await this.db.query<Inventario>(
      `SELECT i.id, i.ingrediente_id, i.cantidad_actual, i.cantidad_minima, i.updated_at,
              ing.nombre as ingrediente_nombre, ing.codigo_de_barras, ing.unidad_medida
       FROM inventario i
       JOIN ingrediente ing ON ing.id = i.ingrediente_id
       ORDER BY ing.nombre`,
    );
    return rows.rows.map((r) => ({
      ...r,
      ingrediente_nombre: r.ingrediente_nombre || undefined,
      codigo_de_barras: r.codigo_de_barras || undefined,
      unidad_medida: r.unidad_medida || undefined,
      bajo_stock: Boolean(r.cantidad_actual <= r.cantidad_minima),
    }));
  }

  async obtener(id: number): Promise<Inventario> {
    const row = await this.db.query<Inventario>(
      `SELECT i.id, i.ingrediente_id, i.cantidad_actual, i.cantidad_minima, i.updated_at,
              ing.nombre as ingrediente_nombre, ing.codigo_de_barras, ing.unidad_medida
       FROM inventario i
       JOIN ingrediente ing ON ing.id = i.ingrediente_id
       WHERE i.id = $1`,
      [id],
    );
    if (!row.rows[0]) throw new Error('Insumo no encontrado.');
    return {
      ...row.rows[0],
      ingrediente_nombre: row.rows[0].ingrediente_nombre || undefined,
      codigo_de_barras: row.rows[0].codigo_de_barras || undefined,
      unidad_medida: row.rows[0].unidad_medida || undefined,
      bajo_stock: Boolean(row.rows[0].cantidad_actual <= row.rows[0].cantidad_minima),
    };
  }

  async registrar(dto: RegistrarIngredienteDto): Promise<Inventario> {
    if (!dto.nombre) throw new Error('El nombre del insumo es obligatorio.');

    const existing = await this.db.query<{ id:number }>('SELECT id FROM ingrediente WHERE lower(nombre) = $1', [dto.nombre.toLowerCase().trim()]);
    if (!existing.rows[0]) {
      const ing = await this.db.query<{ id:number; codigo_de_barras:string | null; unidad_medida:string }>(
        `INSERT INTO ingrediente (nombre, codigo_de_barras, unidad_medida)
         VALUES ($1, $2, $3)
         RETURNING id, codigo_de_barras, unidad_medida`,
        [dto.nombre.trim(), dto.codigo_de_barras ?? null, dto.unidad_medida ?? 'unidad'],
      );
      const id = await this.db.query<{ id:number }>(
        `INSERT INTO inventario (ingrediente_id, cantidad_actual, cantidad_minima)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [ing.rows[0].id, dto.cantidad_inicial ?? 0, dto.cantidad_minima ?? 0],
      );
      return this.obtener(id.rows[0].id);
    }

    await this.db.query(
      `INSERT INTO inventario (ingrediente_id, cantidad_actual, cantidad_minima)
       VALUES ($1, $2, $3)`,
      [existing.rows[0].id, dto.cantidad_inicial ?? 0, dto.cantidad_minima ?? 0],
    );
    return this.obtenerPorIngrediente(existing.rows[0].id);
  }

  async actualizarCantidad(id: number, nuevaCantidad: number): Promise<Inventario> {
    const existing = await this.db.query<{ id:number }>('SELECT id FROM inventario WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new Error('Insumo no encontrado.');
    await this.db.query(
      `UPDATE inventario SET cantidad_actual = $1, updated_at = NOW()
       WHERE id = $2`,
      [nuevaCantidad, id],
    );
    return this.obtener(id);
  }

  async agregarStockPorCodigoBarras(dto: AgregarStockDto): Promise<Inventario> {
    if (!dto.codigo_de_barras) throw new Error('Escanea o escribe el código de barras.');
    if (!Number.isFinite(dto.cantidad) || dto.cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero.');

    const ing = await this.db.query<{ id:number }>('SELECT id FROM ingrediente WHERE codigo_de_barras = $1', [dto.codigo_de_barras.trim()]);
    if (!ing.rows[0]) throw new Error('No se encontró ningún insumo con ese código de barras.');

    const current = await this.db.query<{ cantidad_actual:number }>('SELECT cantidad_actual FROM inventario WHERE ingrediente_id = $1', [ing.rows[0].id]);
    if (!current.rows[0]) throw new Error('No hay registro de inventario para este insumo.');

    const nuevaCantidad = current.rows[0].cantidad_actual + dto.cantidad;
    await this.db.query(
      `UPDATE inventario SET cantidad_actual = $1, updated_at = NOW() WHERE ingrediente_id = $2`,
      [nuevaCantidad, ing.rows[0].id],
    );
    return this.obtenerPorIngrediente(ing.rows[0].id);
  }

  async bajosStock(): Promise<Inventario[]> {
    const rows = await this.db.query<Inventario>(
      `SELECT i.id, i.ingrediente_id, i.cantidad_actual, i.cantidad_minima, i.updated_at,
              ing.nombre as ingrediente_nombre, ing.codigo_de_barras, ing.unidad_medida
       FROM inventario i
       JOIN ingrediente ing ON ing.id = i.ingrediente_id
       WHERE i.cantidad_actual <= i.cantidad_minima
       ORDER BY i.cantidad_actual`,
    );
    return rows.rows.map((r) => ({
      ...r,
      ingrediente_nombre: r.ingrediente_nombre || undefined,
      codigo_de_barras: r.codigo_de_barras || undefined,
      unidad_medida: r.unidad_medida || undefined,
      bajo_stock: true,
    }));
  }

  private async obtenerPorIngrediente(ingredienteId: number): Promise<Inventario> {
    const row = await this.db.query<Inventario>(
      `SELECT i.id, i.ingrediente_id, i.cantidad_actual, i.cantidad_minima, i.updated_at,
              ing.nombre as ingrediente_nombre, ing.codigo_de_barras, ing.unidad_medida
       FROM inventario i
       JOIN ingrediente ing ON ing.id = i.ingrediente_id
       WHERE i.ingrediente_id = $1`,
      [ingredienteId],
    );
    if (!row.rows[0]) throw new Error('No se pudo construir el inventario.');
    return {
      ...row.rows[0],
      ingrediente_nombre: row.rows[0].ingrediente_nombre || undefined,
      codigo_de_barras: row.rows[0].codigo_de_barras || undefined,
      unidad_medida: row.rows[0].unidad_medida || undefined,
      bajo_stock: Boolean(row.rows[0].cantidad_actual <= row.rows[0].cantidad_minima),
    };
  }
}
