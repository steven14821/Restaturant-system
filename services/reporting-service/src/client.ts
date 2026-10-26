import { ServiceClient } from '@restaurante/contract/http';
import type { ResumenVentas, ReportePeriodo } from '@restaurante/contract';

export type ReportingClientProps = {
  baseUrl: string;
  auth?: { token: string };
};

export function crearReportingClient(p: ReportingClientProps): ReportingClient {
  const client = new ServiceClient(p.baseUrl, p.auth ? { token: p.auth.token, tipo: 'bearer' } : undefined);
  return new ReportingClient(client);
}

export class ReportingClient {
  constructor(private readonly client: ServiceClient) {}

  async resumen(): Promise<ResumenVentas> {
    const res = await this.client.get<ResumenVentas>('/api/reports');
    if (!res.ok) throw new Error((res.body?.error as string) || 'resumen ventas falló');
    return res.body!;
  }

  async reportePeriodo(desde: string, hasta: string): Promise<ReportePeriodo> {
    const res = await this.client.get<ReportePeriodo>('/api/reports', { desde, hasta });
    if (!res.ok) throw new Error((res.body?.error as string) || 'reporte por periodo falló');
    return res.body!;
  }
}
