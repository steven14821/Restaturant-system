import { ServiceClient } from '@restaurante/contract/http';
import type { Recomendaciones } from '@restaurante/contract';

export type RecommendationClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearRecommendationClient(p: RecommendationClientProps): RecommendationClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new RecommendationClient(client);
}

export class RecommendationClient {
  constructor(private readonly client: ServiceClient) {}

  async recomendar(limite = 4): Promise<Recomendaciones> {
    const res = await this.client.get<Recomendaciones>('/api/recommendations', { limite });
    if (!res.ok) throw new Error((res.body?.error as string) || 'recomendaciones falló');
    return res.body!;
  }
}
