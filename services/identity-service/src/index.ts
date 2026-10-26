import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { crearIdentityService } from './service.js';

const pool = new Pool({
  connectionString: process.env.IDENTITY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.IDENTITY_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearIdentityService({
  port: Number(process.env.IDENTITY_PORT) || 3003,
  db: pool,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
});

const app = express();
app.use(express.json());

app.get('/api/users', async (_req, res) => {
  try {
    const usuarios = await service.listar();
    res.json({ usuarios });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const usuario = await service.crear(req.body as import('./types.js').CrearUsuarioDto);
    res.status(201).json({ usuario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/users/roles', async (_req, res) => {
  try {
    const roles = await service.roles();
    res.json({ roles });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const usuario = await service.obtener(Number(req.params.id));
    res.json({ usuario });
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const usuario = await service.actualizar(Number(req.params.id), req.body as import('./types.js').EditarUsuarioDto);
    res.json({ usuario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const usuario = await service.desactivar(Number(req.params.id));
    res.json({ usuario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/api/users/by-role/:rol', async (req, res) => {
  try {
    const usuarios = await service.buscarPorRol(req.params.rol as import('@restaurante/contract').RolNombre);
    res.json({ usuarios });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.IDENTITY_PORT) || 3003, () => {
  console.log(`identity-service escuchando en puerto ${Number(process.env.IDENTITY_PORT) || 3003}`);
});
