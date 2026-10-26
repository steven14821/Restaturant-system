import { Pool } from 'pg';
import type { Pedido, EstadoPedido, OrigenPedido, DetallePedido } from '@restaurante/contract';
import type { CrearPedidoInput, ItemPedidoInput, PedidoConDetalles, Props } from './types.js';

export function crearOrderService(p: Props): OrderService {
  return new OrderService(p);
}

const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  RECIBIDO: ['EN PREPARACION', 'CANCELADO'],
  'EN PREPARACION': ['LISTO', 'CANCELADO'],
  LISTO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

export class OrderService {
  private readonly db: Pool;

  constructor(p: Props) {
    this.db = p.db;
  }

  async obtener(id: number): Promise<PedidoConDetalles> {
    const pedido = await this.db.query<Pedido>(
      `SELECT pe.*, m.numero as mesa_numero
       FROM pedido pe LEFT JOIN mesa m ON m.id = pe.mesa_id
       WHERE pe.id = $1`,
      [id],
    );
    if (!pedido.rows[0]) throw new Error('Pedido no encontrado.');
    return this.adjuntarDetalles(pedido.rows[0]);
  }

  async listar(opts: {
    clienteId?: number;
    estado?: EstadoPedido;
    mesaId?: number;
    meseroId?: number;
    confirmado?: boolean;
  } = {}): Promise<PedidoConDetalles[]> {
    let query = `
      SELECT pe.*, m.numero as mesa_numero
      FROM pedido pe LEFT JOIN mesa m ON m.id = pe.mesa_id
      WHERE 1 = 1`;
    const params: unknown[] = [];

    if (opts.clienteId) { query += ' AND pe.cliente_id = $1'; params.push(opts.clienteId); }
    if (opts.estado) { query += ' AND pe.estado = $' + (params.length + 1); params.push(opts.estado); }
    if (opts.mesaId) { query += ' AND pe.mesa_id = $' + (params.length + 1); params.push(opts.mesaId); }
    if (opts.meseroId) { query += ' AND pe.mesero_id = $' + (params.length + 1); params.push(opts.meseroId); }
    if (opts.confirmado !== undefined) { query += ' AND pe.confirmado = $' + (params.length + 1); params.push(opts.confirmado ? 1 : 0); }

    query += ' ORDER BY pe.created_at ASC';

    const rows = await this.db.query<Pedido>(query, params);
    const out: PedidoConDetalles[] = [];
    for (const p of rows.rows) out.push(await this.adjuntarDetalles(p));
    return out;
  }

  async crear(input: CrearPedidoInput): Promise<PedidoConDetalles> {
    if (!input.items || input.items.length === 0) throw new Error('El pedido debe contener al menos un producto.');

    const confirmado = input.confirmado !== false;

    const tx = await this.db.connect();
    try {
      await tx.query('BEGIN');

      let total = 0;
      const detallesCalculados: { platillo_id:number; cantidad:number; precio_unitario:number; subtotal:number }[] = [];

      for (const item of input.items) {
        const p = await tx.query<{ id:number; precio:number; disponible:boolean }>('SELECT id, precio, disponible FROM platillo WHERE id = $1', [item.platillo_id]);
        if (!p.rows[0]) throw new Error(`El platillo con id ${item.platillo_id} no existe.`);
        if (!p.rows[0].disponible) throw new Error('Uno de los platillos seleccionados no está disponible.');
        if (item.cantidad <= 0) throw new Error('La cantidad debe ser mayor a cero.');
        const subtotal = p.rows[0].precio * item.cantidad;
        total += subtotal;
        detallesCalculados.push({ platillo_id: item.platillo_id, cantidad: item.cantidad, precio_unitario: p.rows[0].precio, subtotal });
      }

      const id = (await tx.query(
        `INSERT INTO pedido (cliente_id, mesero_id, mesa_id, origen, estado, observaciones, total, confirmado)
         VALUES ($1, $2, $3, $4, 'RECIBIDO', $5, $6, $7)
         RETURNING id`,
        [input.cliente_id ?? null, input.mesero_id ?? null, input.mesa_id ?? null, input.origen, input.observaciones ?? null, total, confirmado ? 1 : 0],
      )).rows[0].id;

      for (const d of detallesCalculados) {
        await tx.query(
          `INSERT INTO detalle_pedido (pedido_id, platillo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, d.platillo_id, d.cantidad, d.precio_unitario, d.subtotal],
        );
      }

      if (input.mesa_id) {
        await tx.query(`UPDATE mesa SET estado = $1 WHERE id = $2`, [confirmado ? 'PEDIDO EN CURSO' : 'OCUPADA', input.mesa_id]);
      }

      await tx.query('COMMIT');
      return this.obtener(id);
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  }

  async actualizar(id: number, items: ItemPedidoInput[], observaciones?: string): Promise<PedidoConDetalles> {
    const pedido = await this.obtener(id);
    if (pedido.confirmado) throw new Error('El pedido ya fue confirmado y enviado a cocina; no puede modificarse.');

    const tx = await this.db.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('DELETE FROM detalle_pedido WHERE pedido_id = $1', [id]);

      let total = 0;
      for (const item of items) {
        const p = await tx.query<{ precio:number }>('SELECT precio FROM platillo WHERE id = $1', [item.platillo_id]);
        if (!p.rows[0]) throw new Error(`El platillo con id ${item.platillo_id} no existe.`);
        const subtotal = p.rows[0].precio * item.cantidad;
        total += subtotal;
        await tx.query(
          `INSERT INTO detalle_pedido (pedido_id, platillo_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.platillo_id, item.cantidad, p.rows[0].precio, subtotal],
        );
      }

      await tx.query(
        `UPDATE pedido SET total = $1, observaciones = $2, updated_at = NOW() WHERE id = $3`,
        [total, observaciones ?? pedido.observaciones ?? null, id],
      );
      await tx.query('COMMIT');
      return this.obtener(id);
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  }

  async confirmar(id: number): Promise<PedidoConDetalles> {
    const pedido = await this.obtener(id);
    if (pedido.confirmado) throw new Error('El pedido ya fue confirmado previamente.');

    const tx = await this.db.connect();
    try {
      await tx.query('BEGIN');
      await tx.query(`UPDATE pedido SET confirmado = true, updated_at = NOW() WHERE id = $1`, [id]);
      if (pedido.mesa_id) await tx.query(`UPDATE mesa SET estado = 'PEDIDO EN CURSO' WHERE id = $1`, [pedido.mesa_id]);
      await tx.query('COMMIT');
      return this.obtener(id);
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  }

  async cancelar(id: number): Promise<PedidoConDetalles> {
    const pedido = await this.obtener(id);
    if (pedido.confirmado) throw new Error('El pedido ya fue confirmado y enviado a cocina; no puede cancelarse desde este módulo.');

    await this.db.query(`UPDATE pedido SET estado = 'CANCELADO', updated_at = NOW() WHERE id = $1`, [id]);
    await this.liberarMesaSiSinPedidosActivos(pedido.mesa_id);
    return this.obtener(id);
  }

  async actualizarEstado(id: number, nuevoEstado: EstadoPedido): Promise<PedidoConDetalles> {
    const pedido = await this.obtener(id);
    if (!TRANSICIONES_VALIDAS[pedido.estado].includes(nuevoEstado)) throw new Error(`Transición inválida: no se puede pasar de "${pedido.estado}" a "${nuevoEstado}".`);

    await this.db.query(`UPDATE pedido SET estado = $1, updated_at = NOW() WHERE id = $2`, [nuevoEstado, id]);

    if (nuevoEstado === 'ENTREGADO' || nuevoEstado === 'CANCELADO') {
      await this.liberarMesaSiSinPedidosActivos(pedido.mesa_id);
    }

    return this.obtener(id);
  }

  async repetir(pedidoId: number, clienteId: number): Promise<PedidoConDetalles> {
    const original = await this.obtener(pedidoId);
    if (original.cliente_id !== clienteId) throw new Error('No puedes repetir un pedido que no te pertenece.');
    const items = (original.detalles ?? []).map((d) => ({ platillo_id: d.platillo_id, cantidad: d.cantidad }));
    return this.crear({ cliente_id: clienteId, origen: 'CLIENTE', items });
  }

  async pedidosCocina(): Promise<PedidoConDetalles[]> {
    const confirmados = await this.listar({ confirmado: true });
    return confirmados.filter((p) => p.estado === 'RECIBIDO' || p.estado === 'EN PREPARACION');
  }

  async historialCliente(clienteId: number): Promise<PedidoConDetalles[]> {
    const pedidos = await this.listar({ clienteId });
    return pedidos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  private async adjuntarDetalles(pedido: Pedido): Promise<PedidoConDetalles> {
    const detalles = await this.db.query<DetallePedido>(
      `SELECT d.*, p.nombre as platillo_nombre
       FROM detalle_pedido d JOIN platillo p ON p.id = d.platillo_id
       WHERE d.pedido_id = $1`,
      [pedido.id],
    );
    return { ...pedido, detalles: detalles.rows as DetallePedido[] };
  }

  private async liberarMesaSiSinPedidosActivos(mesaId?: number | null): Promise<void> {
    if (!mesaId) return;
    const activos = await this.db.query<{ n:number }>(
      `SELECT COUNT(*) as n FROM pedido
       WHERE mesa_id = $1 AND estado IN ('RECIBIDO', 'EN PREPARACION', 'LISTO')`,
      [mesaId],
    );
    if (!activos.rows[0] || activos.rows[0].n === 0) {
      await this.db.query(`UPDATE mesa SET estado = 'LIBRE' WHERE id = $1`, [mesaId]);
    }
  }
}
