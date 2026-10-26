import express from 'express';
import { Pool } from 'pg';
import { crearMenuService } from './service.js';

const pool = new Pool({
  connectionString: process.env.MENU_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.MENU_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearMenuService({ port: Number(process.env.MENU_PORT) || 3004, db: pool });

const app = express();
app.use(express.json());

// Público
app.get('/api/menu', async (req, res) => {
  try {
    const { disponibles, categoria_id } = req.query;
    const platillos = await service.listarPlatillos({
      soloDisponibles: disponibles === 'false' ? false : true,
      categoriaId: categoria_id ? Number(categoria_id) : undefined,
    });
    res.json({ platillos });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/menu/:id', async (req, res) => {
  try {
    const platillo = await service.obtener(Number(req.params.id));
    res.json({ platillo });
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

// Admin
app.post('/api/menu', async (req, res) => {
  try {
    const platillo = await service.crear(req.body as import('./types.js').CrearPlatilloDto);
    res.status(201).json({ platillo });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/categories', async (_req, res) => {
  try {
    const categorias = await service.listarCategorias();
    res.json({ categorias });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const categoria = await service.crearCategoria(req.body as import('./types.js').CrearCategoriaDto);
    res.status(201).json({ categoria });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  try {
    const platillo = await service.actualizar(Number(req.params.id), req.body as import('./types.js').EditarPlatilloDto);
    res.json({ platillo });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch('/api/menu/:id', async (req, res) => {
  try {
    const platillo = await service.alternarDisponibilidad(Number(req.params.id));
    res.json({ platillo });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await service.eliminar(Number(req.params.id));
    res.json({ message: 'Platillo eliminado.' });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.MENU_PORT) || 3004, () => {
  console.log(`menu-service escuchando en puerto ${Number(process.env.MENU_PORT) || 3004}`);
});
