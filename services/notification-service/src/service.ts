import { Pool } from 'pg';
import type { Notificacion, TipoNotificacion } from '@restaurante/contract';
import type { CrearNotificacionDto, Props } from './types.js';

export function crearNotificationService(p: Props): NotificationService {
  return new NotificationService(p);
}

export class NotificationService {
  private readonly db: Pool;

  constructor(p: Props) {
    this.db = p.db;
  }

  async crear(dto: CrearNotificacionDto): Promise<Notificacion> {
    const row = await this.db.query<Notificacion>(
      `INSERT INTO notificacion (usuario_id, pedido_id, tipo, mensaje)
       VALUES ($1, $2, $3, $4)
       RETURNING id, usuario_id, pedido_id, tipo, mensaje, leida, created_at`,
      [dto.usuario_id, dto.pedido_id, dto.tipo, dto.mensaje],
    );
    return row.rows[0];
  }

  async listar(usuarioId: number, soloNoLeidas = false): Promise<Notificacion[]> {
    let query = 'SELECT id, usuario_id, pedido_id, tipo, mensaje, leida, created_at FROM notificacion WHERE usuario_id = $1';
    const params: unknown[] = [usuarioId];
    if (soloNoLeidas) query += ' AND leida = false';
    query += ' ORDER BY created_at DESC LIMIT 50';
    const rows = await this.db.query<Notificacion>(query, params);
    return rows.rows;
  }

  async marcarLeida(id: number, usuarioId: number): Promise<Notificacion | null> {
    const row = await this.db.query<Notificacion>(
      `UPDATE notificacion SET leida = true
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, usuario_id, pedido_id, tipo, mensaje, leida, created_at`,
      [id, usuarioId],
    );
    return row.rows[0] || null;
  }

  async contarNoLeidas(usuarioId: number): Promise<number> {
    const row = await this.db.query<{ n:number }>(
      `SELECT COUNT(*) as n FROM notificacion WHERE usuario_id = $1 AND leida = false`,
      [usuarioId],
    );
    return Number(row.rows[0].n);
  }
}
