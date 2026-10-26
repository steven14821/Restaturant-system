import express from 'express';
import { construirGateways, middlewareAutenticacion, middlewarePorRol, extraerAuth } from './service.js';
import type { RolNombre } from '@restaurante/contract';

const config = {
  auth: { baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001' },
  menu: { baseUrl: process.env.MENU_SERVICE_URL || 'http://localhost:3004' },
  orders: { baseUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3002' },
  tables: { baseUrl: process.env.TABLE_SERVICE_URL || 'http://localhost:3005' },
  users: { baseUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3003' },
  inventory: { baseUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3007' },
  reports: { baseUrl: process.env.REPORTING_SERVICE_URL || 'http://localhost:3008' },
  notifications: { baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006' },
  recommendations: { baseUrl: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3009' },
};

const gateways = construirGateways(config);

const app = express();
app.use(express.json());

// Público
app.post('/api/auth/guest', async (req, res) => {
  try {
    const r = await gateways.auth.post('/api/auth/guest');
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'guest falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const r = await gateways.auth.post('/api/auth/register', req.body);
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'register falló' });
    return res.status(201).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const r = await gateways.menu.get('/api/menu', req.query);
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'menu falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/menu/:id', async (req, res) => {
  try {
    const r = await gateways.menu.get(`/api/menu/${req.params.id}`);
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'platillo falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/categories', async (_req, res) => {
  try {
    const r = await gateways.menu.get('/api/categories');
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'categorias falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/recommendations', async (req, res) => {
  try {
    const r = await gateways.recommendations.get('/api/recommendations', req.query);
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'recomendaciones falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Login y sesión
app.post('/api/auth/login', async (req, res) => {
  try {
    const r = await gateways.auth.post('/api/auth/login', req.body);
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'login falló' });
    const respuesta = res.json(r.body);
    const usuario = (r.body as { usuario?: { id?:number } })?.usuario;
    if (usuario?.id) {
      respuesta.cookie('token', (r.body as { token?: string }).token || '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8,
      });
    }
    return respuesta;
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/auth/me', middlewareAutenticacion(gateways), async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.cookies?.token;
    const meRes = await gateways.auth.get<{ usuario: { id:number; nombre:string; email:string; rol:RolNombre; activo:boolean } }>('/api/auth/me', undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) return res.status(meRes.status).json(meRes.body ?? { error: 'me falló' });
    return res.json(meRes.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Pedidos
app.get('/api/orders', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (req.query.estado) params.estado = String(req.query.estado);
    if (req.query.mesa_id) params.mesa_id = Number(req.query.mesa_id);
    if (req.query.confirmado) params.confirmado = Boolean(req.query.confirmado);

    if (user.rol === 'CLIENTE') params.clienteId = user.id;
    if (user.rol === 'INVITADO') params.mesa_id = Number(req.query.mesa_id ?? 0);

    const r = await gateways.orders.get('/api/orders', params, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'pedidos falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/orders', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const body = { ...req.body, origen: user.rol === 'MESERO' ? 'MESERO' : 'CLIENTE' as const };
    const r = await gateways.orders.post('/api/orders', body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'crear pedido falló' });
    return res.status(r.status === 201 ? 201 : 200).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/orders/:id', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.orders.get(`/api/orders/${req.params.id}`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'pedido falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.put('/api/orders/:id', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.orders.put(`/api/orders/${req.params.id}`, req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'actualizar pedido falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.delete('/api/orders/:id', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.orders.delete(`/api/orders/${req.params.id}`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'cancelar pedido falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/orders/:id/confirm', middlewarePorRol(['MESERO', 'ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.orders.post(`/api/orders/${req.params.id}/confirm`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'confirmar pedido falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.patch('/api/orders/:id/status', middlewarePorRol(['COCINA', 'MESERO', 'ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.orders.patch(`/api/orders/${req.params.id}/status`, req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'actualizar estado falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/orders/:id/repeat', middlewarePorRol(['CLIENTE']), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.orders.post(`/api/orders/${req.params.id}/repeat`, { clienteId: user.id }, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'repetir pedido falló' });
    return res.status(201).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/orders/cocina', middlewarePorRol(['COCINA']), async (req, res) => {
  try {
    const r = await gateways.orders.get('/api/orders/cocina', undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'pedidos cocina falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Mesas
app.get('/api/tables', middlewarePorRol(['MESERO', 'ADMINISTRADOR', 'COCINA']), async (req, res) => {
  try {
    const r = await gateways.tables.get('/api/tables', undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'mesas falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/tables', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.tables.post('/api/tables', req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'crear mesa falló' });
    return res.status(201).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.put('/api/tables/:id', middlewarePorRol(['MESERO', 'ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.tables.put(`/api/tables/${req.params.id}`, req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'actualizar mesa falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/tables/by-number/:numero', async (req, res) => {
  try {
    const r = await gateways.tables.get(`/api/tables/by-number/${req.params.numero}`);
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'mesa falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Usuarios
app.get('/api/users', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.users.get('/api/users', undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'usuarios falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/users', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.users.post('/api/users', req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'crear usuario falló' });
    return res.status(201).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/users/:id', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.users.get(`/api/users/${req.params.id}`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'usuario falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.put('/api/users/:id', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.users.put(`/api/users/${req.params.id}`, req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'actualizar usuario falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.delete('/api/users/:id', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.users.delete(`/api/users/${req.params.id}`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'desactivar usuario falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/users/by-role/:rol', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.users.get(`/api/users/by-role/${req.params.rol}`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'buscar por rol falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Inventario
app.get('/api/inventory', middlewarePorRol(['ADMINISTRADOR', 'COCINA']), async (req, res) => {
  try {
    const r = await gateways.inventory.get('/api/inventory', undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'inventario falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/inventory', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.inventory.post('/api/inventory', req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'registrar inventario falló' });
    return res.status(201).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.put('/api/inventory/:id', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.inventory.put(`/api/inventory/${req.params.id}`, req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'actualizar inventario falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/api/inventory/agregar', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.inventory.post('/api/inventory/agregar', req.body, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'agregar stock falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Reportes
app.get('/api/reports', middlewarePorRol(['ADMINISTRADOR']), async (req, res) => {
  try {
    const r = await gateways.reports.get('/api/reports', req.query, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'reportes falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Notificaciones
app.post('/api/notifications', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.notifications.post('/api/notifications', { ...req.body, usuario_id: user.id }, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'crear notificación falló' });
    return res.status(201).json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/notifications', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.notifications.get('/api/notifications', { usuarioId: user.id, soloNoLeidas: req.query.soloNoLeidas === 'true' ? 'true' : 'false' }, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'notificaciones falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.patch('/api/notifications/:id', middlewareAutenticacion(gateways), async (req, res) => {
  const user = extraerAuth(req);
  if (!user) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const r = await gateways.notifications.patch(`/api/notifications/${req.params.id}?usuarioId=${user.id}`, undefined, {
      headers: { Authorization: `Bearer ${req.headers.authorization || ''}` },
    });
    if (!r.ok) return res.status(r.status).json(r.body ?? { error: 'marcar leída falló' });
    return res.json(r.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const port = Number(process.env.GATEWAY_PORT) || 3010;
app.listen(port, () => {
  console.log(`gateway-service escuchando en puerto ${port}`);
});
