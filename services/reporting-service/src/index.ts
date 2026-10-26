import express from 'express';
import { Pool } from 'pg';
import { crearReportingService } from './service.js';

const pool = new Pool({
  connectionString: process.env.REPORTING_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.REPORTING_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const service = crearReportingService({ port: Number(process.env.REPORTING_PORT) || 3008, db: pool });

const app = express();
app.use(express.json());

app.get('/api/reports', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    if (desde && hasta) {
      const reporte = await service.generarReportePorPeriodo(String(desde), String(hasta));
      return res.json(reporte);
    }
    const resumen = await service.resumenVentas();
    res.json(resumen);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(Number(process.env.REPORTING_PORT) || 3008, () => {
  console.log(`reporting-service escuchando en puerto ${Number(process.env.REPORTING_PORT) || 3008}`);
});
