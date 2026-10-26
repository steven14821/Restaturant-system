import { ServiceClient } from '@restaurante/contract/http';
import type { RolNombre } from '@restaurante/contract';
import type { ServiceConfig } from './types.js';

export type GatewayConfig = {
  auth: ServiceConfig;
  menu: ServiceConfig;
  orders: ServiceConfig;
  tables: ServiceConfig;
  users: ServiceConfig;
  inventory: ServiceConfig;
  reports: ServiceConfig;
  notifications: ServiceConfig;
  recommendations: ServiceConfig;
};

export function construirGateways(config: GatewayConfig): Gateways {
  return {
    auth: new ServiceClient(config.auth.baseUrl, config.auth.auth),
    menu: new ServiceClient(config.menu.baseUrl, config.menu.auth),
    orders: new ServiceClient(config.orders.baseUrl, config.orders.auth),
    tables: new ServiceClient(config.tables.baseUrl, config.tables.auth),
    users: new ServiceClient(config.users.baseUrl, config.users.auth),
    inventory: new ServiceClient(config.inventory.baseUrl, config.inventory.auth),
    reports: new ServiceClient(config.reports.baseUrl, config.reports.auth),
    notifications: new ServiceClient(config.notifications.baseUrl, config.notifications.auth),
    recommendations: new ServiceClient(config.recommendations.baseUrl, config.recommendations.auth),
  };
}

export type Gateways = Record<string, ServiceClient>;

export function middlewareAutenticacion(gateways: Gateways) {
  return async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    try {
      const meRes = await gateways.auth.get<{ usuario: { id:number; nombre:string; email:string; rol:RolNombre; activo:boolean } }>('/api/auth/me', undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        return res.status(401).json({ error: 'No autenticado.' });
      }
      req['auth'] = meRes.body?.usuario;
      next();
    } catch {
      res.status(401).json({ error: 'No autenticado.' });
    }
  };
}

export function middlewarePorRol(roles: RolNombre[]) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const user = req['auth'] as { rol: RolNombre } | undefined;
    if (!user || !roles.includes(user.rol)) {
      return res.status(403).json({ error: `Acceso denegado. Se requiere uno de los roles: ${roles.join(', ')}.` });
    }
    next();
  };
}

export function extraerAuth(req: import('express').Request): { id:number; nombre:string; email:string; rol:RolNombre; activo:boolean } | null {
  return req['auth'] || null;
}
