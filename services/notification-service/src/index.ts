import express from 'express';
import { Pool } from 'pg';
import { crearNotificationService } from './service.js';

const pool = new Pool({
  connectionString: process.env.NOTIFICATION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NOTIFICATION_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearNotificationService({ port: Number(process.env.NOTIFICATION_PORT) || 3006, db: pool });

const app = express();
app.use(express.json());

app.post('/api/notifications', async (req, res) => {
  try {
    const notif = await service.crear(req.body as import('./types.js').CrearNotificacionDto);
    res.status(201).json({ notificacion: notif });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const usuarioId = Number(req.query.usuarioId ?? 0);
    const soloNoLeidas = req.query.soloNoLeidas === 'true';
    if (!usuarioId) return res.status(400).json({ error: 'usuarioId es obligatorio.' });
    const notificaciones = await service.listar(usuarioId, soloNoLeidas);
    res.json({ notificaciones });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/notifications/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const notificaciones = await service.listar(id, false);
    const notif = notificaciones.find((n) => n.id === id);
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json({ notificacion: notif });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuarioId = Number(req.query.usuarioId ?? 0);
    if (!usuarioId) return res.status(400).json({ error: 'usuarioId es obligatorio.' });
    const notif = await service.marcarLeida(id, usuarioId);
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada o sin permiso.' });
    res.json({ notificacion: notif });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/notifications/unread-count/:usuarioId', async (req, res) => {
  try {
    const count = await service.contarNoLeidas(Number(req.params.usuarioId));
    res.json({ count });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.NOTIFICATION_PORT) || 3006, () => {
  console.log(`notification-service escuchando en puerto ${Number(process.env.NOTIFICATION_PORT) || 3006}`);
});
