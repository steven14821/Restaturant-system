import { Pool } from 'pg';
import type { ResumenVentas, ReportePeriodo } from '@restaurante/contract';
import type { Props } from './types.js';

const ESTADOS_VENTA_VALIDA = "('ENTREGADO','LISTO','EN PREPARACION','RECIBIDO')";

export function crearReportingService(p: Props): ReportingService {
  return new ReportingService(p);
}

export class ReportingService {
  private readonly db: Pool;

  constructor(p: Props) {
    this.db = p.db;
  }

  async resumenVentas(): Promise<ResumenVentas> {
    const ventasDia = await this.db.query<{ total:number; pedidos:number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as pedidos
       FROM pedido WHERE estado IN ${ESTADOS_VENTA_VALIDA} AND (created_at::date) = CURRENT_DATE`,
    );

    const ventasSemana = await this.db.query<{ total:number; pedidos:number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as pedidos
       FROM pedido WHERE estado IN ${ESTADOS_VENTA_VALIDA} AND (created_at::date) >= CURRENT_DATE - INTERVAL '7 days'`,
    );

    const ventasMes = await this.db.query<{ total:number; pedidos:number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as pedidos
       FROM pedido WHERE estado IN ${ESTADOS_VENTA_VALIDA} AND to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')`,
    );

    const totalPedidos = await this.db.query<{ total:number }>('SELECT COUNT(*) as total FROM pedido');

    const masVendidos = await this.db.query<{ nombre:string; unidades_vendidas:number; ingresos:number }>(
      `SELECT p.nombre, SUM(d.cantidad) as unidades_vendidas, SUM(d.subtotal) as ingresos
       FROM detalle_pedido d
       JOIN pedido pe ON pe.id = d.pedido_id
       JOIN platillo p ON p.id = d.platillo_id
       WHERE pe.estado IN ${ESTADOS_VENTA_VALIDA}
       GROUP BY p.id
       ORDER BY unidades_vendidas DESC
       LIMIT 5`,
    );

    const ventasPorDiaSemana = await this.db.query<{ fecha:string; total:number }>(
      `SELECT (created_at::date) as fecha, COALESCE(SUM(total), 0) as total
       FROM pedido
       WHERE estado IN ${ESTADOS_VENTA_VALIDA} AND (created_at::date) >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY (created_at::date)
       ORDER BY fecha`,
    );

    return {
      ventas_dia: { total: Number(ventasDia.rows[0]?.total ?? 0), pedidos: Number(ventasDia.rows[0]?.pedidos ?? 0) },
      ventas_semana: { total: Number(ventasSemana.rows[0]?.total ?? 0), pedidos: Number(ventasSemana.rows[0]?.pedidos ?? 0) },
      ventas_mes: { total: Number(ventasMes.rows[0]?.total ?? 0), pedidos: Number(ventasMes.rows[0]?.pedidos ?? 0) },
      total_pedidos_historico: Number(totalPedidos.rows[0]?.total ?? 0),
      productos_mas_vendidos: masVendidos.rows as { nombre:string; unidades_vendidas:number; ingresos:number }[],
      ventas_ultimos_7_dias: ventasPorDiaSemana.rows as { fecha:string; total:number }[],
    };
  }

  async generarReportePorPeriodo(desde: string, hasta: string): Promise<ReportePeriodo> {
    const ventas = await this.db.query<{ total:number; pedidos:number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as pedidos
       FROM pedido WHERE estado IN ${ESTADOS_VENTA_VALIDA} AND (created_at::date) BETWEEN $1::date AND $2::date`,
      [desde, hasta],
    );

    const productos = await this.db.query<{ nombre:string; unidades_vendidas:number; ingresos:number }>(
      `SELECT p.nombre, SUM(d.cantidad) as unidades_vendidas, SUM(d.subtotal) as ingresos
       FROM detalle_pedido d
       JOIN pedido pe ON pe.id = d.pedido_id
       JOIN platillo p ON p.id = d.platillo_id
       WHERE pe.estado IN ${ESTADOS_VENTA_VALIDA} AND (pe.created_at::date) BETWEEN $1::date AND $2::date
       GROUP BY p.id
       ORDER BY unidades_vendidas DESC`,
      [desde, hasta],
    );

    const consumo = await this.db.query<{ nombre:string; consumo_estimado:number; unidad_medida:string | null }>(
      `SELECT ing.nombre, SUM(d.cantidad * pi.cantidad_requerida) as consumo_estimado, ing.unidad_medida
       FROM detalle_pedido d
       JOIN pedido pe ON pe.id = d.pedido_id
       JOIN platillo_ingrediente pi ON pi.platillo_id = d.platillo_id
       JOIN ingrediente ing ON ing.id = pi.ingrediente_id
       WHERE pe.estado IN ${ESTADOS_VENTA_VALIDA} AND (pe.created_at::date) BETWEEN $1::date AND $2::date
       GROUP BY ing.id, ing.nombre, ing.unidad_medida
       ORDER BY consumo_estimado DESC`,
      [desde, hasta],
    );

    return {
      periodo: { desde, hasta },
      ventas: { total: Number(ventas.rows[0]?.total ?? 0), pedidos: Number(ventas.rows[0]?.pedidos ?? 0) },
      productos_mas_vendidos: productos.rows as { nombre:string; unidades_vendidas:number; ingresos:number }[],
      consumo_inventario: consumo.rows as { nombre:string; consumo_estimado:number; unidad_medida:string | null }[],
    };
  }
}
