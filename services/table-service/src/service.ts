import { Pool } from 'pg';
import type { Mesa, EstadoMesa } from '@restaurante/contract';
import type { CrearMesaDto, Props } from './types.js';

export function crearTableService(p: Props): TableService {
  return new TableService(p);
}

export class TableService {
  private readonly db: Pool;

  constructor(p: Props) {
    this.db = p.db;
  }

  async listar(): Promise<Mesa[]> {
    const rows = await this.db.query<Mesa>('SELECT id, numero, capacidad, estado FROM mesa ORDER BY numero');
    return rows.rows.map((r) => ({ ...r, estado: r.estado as EstadoMesa }));
  }

  async obtener(id: number): Promise<Mesa> {
    const row = await this.db.query<Mesa>('SELECT id, numero, capacidad, estado FROM mesa WHERE id = $1', [id]);
    if (!row.rows[0]) throw new Error('Mesa no encontrada.');
    return { ...row.rows[0], estado: row.rows[0].estado as EstadoMesa };
  }

  async buscarPorNumero(numero: number): Promise<Mesa | undefined> {
    const row = await this.db.query<Mesa>('SELECT id, numero, capacidad, estado FROM mesa WHERE numero = $1', [numero]);
    if (!row.rows[0]) return undefined;
    return { ...row.rows[0], estado: row.rows[0].estado as EstadoMesa };
  }

  async crear(dto: CrearMesaDto): Promise<Mesa> {
    if (!dto.numero) throw new Error('El número de mesa es obligatorio.');

    const existing = await this.db.query<{ id:number }>('SELECT id FROM mesa WHERE numero = $1', [dto.numero]);
    if (existing.rows[0]) throw new Error('Ya existe una mesa con ese número.');

    const row = await this.db.query<Mesa>(
      `INSERT INTO mesa (numero, capacidad, estado)
       VALUES ($1, $2, 'LIBRE')
       RETURNING id, numero, capacidad, estado`,
      [dto.numero, dto.capacidad ?? 4],
    );
    return { ...row.rows[0], estado: row.rows[0].estado as EstadoMesa };
  }

  async actualizarEstado(id: number, estado: EstadoMesa): Promise<Mesa> {
    const existing = await this.db.query<{ id:number }>('SELECT id FROM mesa WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new Error('Mesa no encontrada.');

    const row = await this.db.query<Mesa>(
      `UPDATE mesa SET estado = $1 WHERE id = $2 RETURNING id, numero, capacidad, estado`,
      [estado, id],
    );
    return { ...row.rows[0], estado: row.rows[0].estado as EstadoMesa };
  }
}
