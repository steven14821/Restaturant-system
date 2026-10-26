import type { PlatoRecomendado, Recomendaciones } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
  llmBaseUrl?: string;
  llmApiKey?: string;
  llmModel?: string;
  llmTimeoutMs?: number;
};
