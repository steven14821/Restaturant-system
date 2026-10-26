/**
 * @restaurante/contract
 *
 * Tipos compartidos entre microservicios y sus clientes HTTP.
 *
 * Regla de oro: los microservicios no comparten lógica de negocio entre sí,
 * solo comparten contratos, códigos de error normalizados y la capa HTTP de
 * bajo nivel. Cada servicio decide cómo ejecuta, qué tablas utiliza y qué
 * transacciones abre; lo demás servicios hablan con él solo por la red.
 */

export type RolNombre = 'CLIENTE' | 'MESERO' | 'COCINA' | 'ADMINISTRADOR' | 'INVITADO';

export type EstadoMesa = 'LIBRE' | 'OCUPADA' | 'PEDIDO EN CURSO';

export type EstadoPedido = 'RECIBIDO' | 'EN PREPARACION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';

export type OrigenPedido = 'CLIENTE' | 'MESERO';

export type TipoNotificacion = 'INFO' | 'PEDIDO_LISTO' | 'PEDIDO_NUEVO' | 'STOCK_BAJO';

/* -------------------------------------------------------------------------- */
/*  Respuestas normalizadas                                                   */
/* -------------------------------------------------------------------------- */

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export interface ApiPaged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* -------------------------------------------------------------------------- */
/*  Dominio compartido                                                        */
/* -------------------------------------------------------------------------- */

export interface UsuarioResumen {
  id: number;
  nombre: string;
  email: string;
  rol: RolNombre;
  activo: boolean;
}

export interface UsuarioPublico extends UsuarioResumen {}

export interface Persona {
  id: number;
  nombre: string;
  email: string;
  rol: RolNombre;
  activo: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

export interface Platillo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen_url?: string | null;
  disponible: boolean;
  categoria_id: number | null;
  categoria_nombre?: string | null;
}

export interface PlatoRecomendado extends Platillo {
  veces_vendido: number;
  motivacion: string;
}

export interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  estado: EstadoMesa;
}

export interface DetallePedido {
  id: number;
  pedido_id: number;
  platillo_id: number;
  platillo_nombre?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  cliente_id: number | null;
  mesero_id: number | null;
  mesa_id: number | null;
  mesa_numero?: number | null;
  origen: OrigenPedido;
  estado: EstadoPedido;
  observaciones?: string | null;
  total: number;
  confirmado: boolean;
  created_at: string;
  updated_at: string;
  detalles?: DetallePedido[];
}

export interface Inventario {
  id: number;
  ingrediente_id: number;
  ingrediente_nombre?: string | null;
  codigo_de_barras?: string | null;
  unidad_medida?: string | null;
  cantidad_actual: number;
  cantidad_minima: number;
  bajo_stock?: boolean;
}

export interface Notificacion {
  id: number;
  usuario_id: number;
  pedido_id: number | null;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export interface ResumenVentas {
  ventas_dia: { total: number; pedidos: number };
  ventas_semana: { total: number; pedidos: number };
  ventas_mes: { total: number; pedidos: number };
  total_pedidos_historico: number;
  productos_mas_vendidos: {nombre:string; unidades_vendidas:number; ingresos:number}[];
  ventas_ultimos_7_dias: {fecha:string; total:number}[];
}

export interface ReportePeriodo {
  periodo: { desde: string; hasta: string };
  ventas: { total: number; pedidos: number };
  productos_mas_vendidos: {nombre:string; unidades_vendidas:number; ingresos:number}[];
  consumo_inventario: {nombre:string; consumo_estimado:number; unidad_medida:string|null}[];
}

export interface Recomendaciones {
  mensaje: string;
  items: PlatoRecomendado[];
}

export interface TokenPayload {
  sub: number;
  email: string;
  rol: RolNombre;
  nombre: string;
}

export interface AuthSession {
  usuario: UsuarioPublico;
  token: string;
}
