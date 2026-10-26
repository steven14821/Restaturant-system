import express from 'express';
import { Pool } from 'pg';
import { crearRecommendationService } from './service.js';

const pool = new Pool({
  connectionString: process.env.RECOMMENDATION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.RECOMMENDATION_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearRecommendationService({
  port: Number(process.env.RECOMMENDATION_PORT) || 3009,
  db: pool,
  llmBaseUrl: process.env.AI_BASE_URL,
  llmApiKey: process.env.AI_API_KEY,
  llmModel: process.env.AI_MODEL,
  llmTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 12000,
});

const app = express();
app.use(express.json());

app.get('/api/recommendations', async (req, res) => {
  try {
    const limite = Math.min(Math.max(Number(req.query.limite ?? 4), 1), 8);
    const resultado = await service.recomendar(limite);
    res.json(resultado);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.RECOMMENDATION_PORT) || 3009, () => {
  console.log(`recommendation-service escuchando en puerto ${Number(process.env.RECOMMENDATION_PORT) || 3009}`);
});
