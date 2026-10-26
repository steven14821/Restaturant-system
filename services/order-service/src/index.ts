import express from 'express';
import { Pool } from 'pg';
import { crearOrderService } from './service.js';

const pool = new Pool({
  connectionString: process.env.ORDER_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.ORDER_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearOrderService({ port: 3002, db: pool });

const app = express();
app.use(express.json());

app.get('/api/orders', async (req, res) => {
  try {
    const { clienteId, estado, mesaId, meseroId, confirmado } = req.query;
    const pedidos = await service.listar({
      clienteId: clienteId ? Number(clienteId) : undefined,
      estado: estado as import('@restaurante/contract').EstadoPedido | undefined,
      mesaId: mesaId ? Number(mesaId) : undefined,
      meseroId: meseroId ? Number(meseroId) : undefined,
      confirmado: confirmado ? Boolean(confirmado) : undefined,
    });
    res.json({ pedidos });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const pedido = await service.crear(req.body);
    res.status(201).json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const pedido = await service.obtener(Number(req.params.id));
    res.json({ pedido });
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { items, observaciones } = req.body;
    const pedido = await service.actualizar(Number(req.params.id), items, observaciones);
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const pedido = await service.cancelar(Number(req.params.id));
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/orders/:id/confirm', async (req, res) => {
  try {
    const pedido = await service.confirmar(Number(req.params.id));
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { estado } = req.body;
    const pedido = await service.actualizarEstado(Number(req.params.id), estado);
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/orders/:id/repeat', async (req, res) => {
  try {
    const { clienteId } = req.body;
    const pedido = await service.repetir(Number(req.params.id), Number(clienteId));
    res.status(201).json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/orders/cocina', async (_req, res) => {
  try {
    const pedidos = await service.pedidosCocina();
    res.json({ pedidos });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/orders/client/history/:clienteId', async (req, res) => {
  try {
    const pedidos = await service.historialCliente(Number(req.params.clienteId));
    res.json({ pedidos });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.ORDER_PORT) || 3002, () => {
  console.log(`order-service escuchando en puerto ${Number(process.env.ORDER_PORT) || 3002}`);
});
