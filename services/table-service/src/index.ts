import express from 'express';
import { Pool } from 'pg';
import { crearTableService } from './service.js';

const pool = new Pool({
  connectionString: process.env.TABLE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.TABLE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearTableService({ port: Number(process.env.TABLE_PORT) || 3005, db: pool });

const app = express();
app.use(express.json());

// Público: resolución de mesa por número (QR/NFC)
app.get('/api/tables/by-number/:numero', async (req, res) => {
  try {
    const mesa = await service.buscarPorNumero(Number(req.params.numero));
    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada.' });
    res.json({ mesa });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Protegido por rol (mesero/admin/cocina)
app.get('/api/tables', async (_req, res) => {
  try {
    const mesas = await service.listar();
    res.json({ mesas });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/tables/:id', async (req, res) => {
  try {
    const mesa = await service.obtener(Number(req.params.id));
    res.json({ mesa });
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

app.post('/api/tables', async (req, res) => {
  try {
    const mesa = await service.crear(req.body as import('./types.js').CrearMesaDto);
    res.status(201).json({ mesa });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.put('/api/tables/:id', async (req, res) => {
  try {
    const { estado } = req.body;
    const mesa = await service.actualizarEstado(Number(req.params.id), estado);
    res.json({ mesa });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.TABLE_PORT) || 3005, () => {
  console.log(`table-service escuchando en puerto ${Number(process.env.TABLE_PORT) || 3005}`);
});
