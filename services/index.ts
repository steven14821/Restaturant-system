/**
 * services/index.ts
 *
 * Índice informativo de microservicios. No ejecuta nada por sí mismo; sirve
 * como punto de entrada documental para scripts de desarrollo y validación.
 */

export const SERVICES = [
  {
    name: 'auth-service',
    path: './auth-service',
    port: 3001,
    role: 'Identidad y sesiones',
  },
  {
    name: 'order-service',
    path: './order-service',
    port: 3002,
    role: 'Ciclo de vida de pedidos',
  },
  {
    name: 'identity-service',
    path: './identity-service',
    port: 3003,
    role: 'Gestión de usuarios y roles',
  },
  {
    name: 'menu-service',
    path: './menu-service',
    port: 3004,
    role: 'Catálogo y menú',
  },
  {
    name: 'table-service',
    path: './table-service',
    port: 3005,
    role: 'Estado de mesas y QR/NFC',
  },
  {
    name: 'notification-service',
    path: './notification-service',
    port: 3006,
    role: 'Notificaciones entre usuarios y pedidos',
  },
  {
    name: 'inventory-service',
    path: './inventory-service',
    port: 3007,
    role: 'Inventario y alertas de stock',
  },
  {
    name: 'reporting-service',
    path: './reporting-service',
    port: 3008,
    role: 'Reportes y panel de ventas',
  },
  {
    name: 'recommendation-service',
    path: './recommendation-service',
    port: 3009,
    role: 'Recomendaciones personalizadas',
  },
  {
    name: 'gateway-service',
    path: './gateway-service',
    port: 3010,
    role: 'Enrutamiento por rol y entrada única',
  },
  {
    name: 'order-orchestrator-service',
    path: './order-orchestrator-service',
    port: 3011,
    role: 'Coordinación de flujos de pedidos',
  },
] as const;

export type ServiceEntry = typeof SERVICES[number];
