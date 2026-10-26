import express from 'express';
import { Pool } from 'pg';
import { crearAuthService } from './service.js';
import type { LoginDto, RegistroDto } from './types.js';

const pool = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.AUTH_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearAuthService({
  port: Number(process.env.AUTH_PORT) || 3001,
  jwtSecret: process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || '8h',
  db: pool,
});

const app = express();
app.use(express.json());

// Invitado anónimo para pedir en mesa sin cuenta.
app.post('/api/auth/guest', async (_req, res) => {
  try {
    const result = await service.guest();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Login de cuentas reales (operadores / clientes registrados).
app.post('/api/auth/login', async (req, res) => {
  try {
    const login: LoginDto = req.body;
    const result = await service.login(login);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: (e as Error).message });
  }
});

// Registro público de clientes.
app.post('/api/auth/register', async (req, res) => {
  try {
    const registro: RegistroDto = req.body;
    const usuario = await service.registro(registro);
    res.status(201).json({ usuario });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Quién soy ahora (desde token o cookie).
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.cookies?.token;
    const payload = token ? service.verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: 'No autenticado.' });
    const me = await service.me(payload.sub);
    res.json(me);
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
});

const port = service['db'] ? service.constructor['port'] : Number(process.env.AUTH_PORT) || 3001;
app.listen(Number(process.env.AUTH_PORT) || 3001, () => {
  console.log(`auth-service escuchando en puerto ${Number(process.env.AUTH_PORT) || 3001}`);
});
