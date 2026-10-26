import express from 'express';
import { crearOrchestrator } from './service.js';

const orchestrator = crearOrchestrator({
  port: Number(process.env.ORCHESTRATOR_PORT) || 3011,
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  tableServiceUrl: process.env.TABLE_SERVICE_URL || 'http://localhost:3005',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  authToken: process.env.ORCHESTRATOR_AUTH_TOKEN,
});

const app = express();
app.use(express.json());

app.post('/api/orchestrator/orders/mesero', async (req, res) => {
  try {
    const pedido = await orchestrator.registrarPedidoDesdeMesero(
      Number(req.body.mesa_id),
      req.body.items,
      req.body.observaciones,
      req.body.mesero_id,
      req.body.confirmado,
    );
    res.status(201).json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/orchestrator/orders/cliente', async (req, res) => {
  try {
    const pedido = await orchestrator.registrarPedidoDesdeCliente(
      Number(req.body.mesa_id),
      req.body.items,
      req.body.observaciones,
      req.body.cliente_id,
    );
    res.status(201).json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/orchestrator/orders/:id/confirm', async (req, res) => {
  try {
    const pedido = await orchestrator.confirmarPedido(Number(req.params.id));
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/orchestrator/orders/:id', async (req, res) => {
  try {
    const pedido = await orchestrator.escucharEstado(Number(req.params.id));
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch('/api/orchestrator/orders/:id/status', async (req, res) => {
  try {
    const pedido = await orchestrator.avanzarEstado(Number(req.params.id), req.body.estado);
    res.json({ pedido });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/orchestrator/orders/:id/release-table', async (req, res) => {
  try {
    await orchestrator.liberarMesaSiEsPosible(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.ORCHESTRATOR_PORT) || 3011, () => {
  console.log(`order-orchestrator-service escuchando en puerto ${Number(process.env.ORCHESTRATOR_PORT) || 3011}`);
});
