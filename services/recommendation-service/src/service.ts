import { Pool } from 'pg';
import type { PlatoRecomendado, Recomendaciones } from '@restaurante/contract';
import type { Props } from './types.js';

export function crearRecommendationService(p: Props): RecommendationService {
  return new RecommendationService(p);
}

export class RecommendationService {
  private readonly db: Pool;
  private readonly llmBaseUrl?: string;
  private readonly llmApiKey?: string;
  private readonly llmModel?: string;
  private readonly llmTimeoutMs?: number;

  constructor(p: Props) {
    this.db = p.db;
    this.llmBaseUrl = p.llmBaseUrl;
    this.llmApiKey = p.llmApiKey;
    this.llmModel = p.llmModel ?? 'gpt-4o-mini';
    this.llmTimeoutMs = p.llmTimeoutMs ?? 12000;
  }

  async recomendar(limite = 4): Promise<Recomendaciones> {
    const top = await this.topSemana(limite);
    const mensajeBase = `Para hoy te recomendamos estos platillos, los más pedidos recientemente por nuestros clientes.`;

    if (this.llmBaseUrl && this.llmApiKey) {
      try {
        const narrativa = await this.narrativaIA(top, limite);
        if (narrativa) return narrativa;
      } catch {
        // fallback regla si la IA no responde
      }
    }

    return {
      mensaje: mensajeBase,
      items: top,
    };
  }

  private async topSemana(limite: number): Promise<PlatoRecomendado[]> {
    const rows = await this.db.query<PlatoRecomendado>(
      `SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url, p.disponible,
              p.categoria_id, c.nombre as categoria_nombre,
              COALESCE(SUM(d.cantidad), 0) as veces_vendido,
              p.descripcion as motivacion
       FROM platillo p
       LEFT JOIN categoria c ON c.id = p.categoria_id
       LEFT JOIN detalle_pedido d ON d.platillo_id = p.id
       LEFT JOIN pedido pe ON pe.id = d.pedido_id
       WHERE p.disponible = true
         AND pe.estado IN ('ENTREGADO','LISTO','EN PREPARACION','RECIBIDO')
         AND (pe.created_at::date) >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY p.id, c.nombre
       ORDER BY veces_vendido DESC
       LIMIT $1`,
      [limite],
    );
    return rows.rows;
  }

  private async narrativaIA(top: PlatoRecomendado[], limite: number): Promise<Recomendaciones | null> {
    if (!this.llmBaseUrl || !this.llmApiKey) return null;

    const ctx = top.map((p) => `- ${p.nombre} (vendido ${p.veces_vendido}x esta semana; ${p.descripcion || 'sin descripción'})`).join('\n');
    const prompt = `Eres el comensal que recomienda la carta de un restaurante. Dadas las opciones más pedidas esta semana:
${ctx}

Responde en JSON estricto con esta estructura:
{ "mensaje": "string corto y cálido", "motivaciones": { "<id>": "string corta razón", ... } }

No agregues campos extra. Usa los ids de arriba.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.llmTimeoutMs);
    try {
      const response = await fetch(`${this.llmBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.llmApiKey}` },
        body: JSON.stringify({ model: this.llmModel, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json();
      const texto = (data.choices?.[0]?.message?.content || '') as string;
      const parsed = JSON.parse(texto);
      const motivaciones = parsed.motivaciones || {};
      const items = top.map((p) => ({ ...p, motivacion: (motivaciones[String(p.id)] || p.descripcion || '') }));
      return { mensaje: parsed.mensaje || 'Para hoy te recomendamos estos platillos.', items };
    } finally {
      clearTimeout(timer);
    }
  }
}
