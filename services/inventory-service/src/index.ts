import express from 'express';
import { Pool } from 'pg';
import { crearInventoryService } from './service.js';

const pool = new Pool({
  connectionString: process.env.INVENTORY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.INVENTORY_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearInventoryService({ port: Number(process.env.INVENTORY_PORT) || 3007, db: pool });

const app = express();
app.use(express.json());

app.get('/api/inventory', async (_req, res) => {
  try {
    const inventario = await service.listar();
    res.json({ inventario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/inventory/:id', async (req, res) => {
  try {
    const inventario = await service.obtener(Number(req.params.id));
    res.json({ inventario });
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

app.get('/api/inventory/low', async (_req, res) => {
  try {
    const inventario = await service.bajosStock();
    res.json({ inventario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const inventario = await service.registrar(req.body as import('./types.js').RegistrarIngredienteDto);
    res.status(201).json({ inventario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { cantidad_actual } = req.body;
    if (cantidad_actual === undefined) return res.status(400).json({ error: 'cantidad_actual es obligatoria.' });
    const inventario = await service.actualizarCantidad(Number(req.params.id), Number(cantidad_actual));
    res.json({ inventario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/inventory/agregar', async (req, res) => {
  try {
    const inventario = await service.agregarStockPorCodigoBarras(req.body as import('./types.js').AgregarStockDto);
    res.json({ inventario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.INVENTORY_PORT) || 3007, () => {
  console.log(`inventory-service escuchando en puerto ${Number(process.env.INVENTORY_PORT) || 3007}`);
});
