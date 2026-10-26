/**
 * Cliente HTTP mínimo usado por los clientes de servicio.
 *
 * Diseñado para Node 18+ (global fetch) y para el caso en el que un servicio
 * quiera ejecutarse sin dependencias extra. Los clientes de cada servicio
 * construyen sobre esto y devuelven tipado de dominio.
 */
export type ServiceAuth = {
  token: string;
  tipo: 'bearer';
};

export interface HttpClientOptions {
  baseUrl: string;
  /** Si se provee, las peticiones incluyen Authorization: Bearer <token> */
  auth?: ServiceAuth;
  /** Mapa opcional de interceptores para logging/retries en un futuro */
  beforeRequest?: (req: Request) => Request;
}

export interface FetchResponse<T> {
  ok: boolean;
  status: number;
  body: T | null;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function jsonFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<FetchResponse<T>> {
  let request = new Request(input, init);

  if (init?.body && !(request.headers.get('Content-Type') || '').includes('json')) {
    request = new Request(request, { headers: { ...Object.fromEntries(request.headers), ...JSON_HEADERS } });
  }

  const response = await fetch(request);
  const ok = response.ok;

  let body: T | null = null;
  if (response.status !== 204) {
    try {
      body = (await response.json()) as T;
    } catch {
      body = null as unknown as T;
    }
  }

  return { ok, status: response.status, body };
}

export class ServiceClient {
  constructor(
    public readonly baseUrl: string,
    public readonly auth?: ServiceAuth,
    public readonly beforeRequest?: (req: Request) => Request,
  ) {}

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<FetchResponse<T>> {
    const url = new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const request = this.build(url, { method: 'GET' });
    return jsonFetch<T>(request);
  }

  async post<T, B = unknown>(path: string, body?: B): Promise<FetchResponse<T>> {
    return jsonFetch<T>(
      this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async put<T, B = unknown>(path: string, body?: B): Promise<FetchResponse<T>> {
    return jsonFetch<T>(
      this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), {
        method: 'PUT',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async patch<T, B = unknown>(path: string, body?: B): Promise<FetchResponse<T>> {
    return jsonFetch<T>(
      this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), {
        method: 'PATCH',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async delete<T>(path: string): Promise<FetchResponse<T>> {
    return jsonFetch<T>(this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), { method: 'DELETE' }));
  }

  private build(url: URL, init: RequestInit): Request {
    let request = new Request(url.toString(), init);

    if (this.auth?.tipo === 'bearer') {
      request = new Request(request, {
        headers: { ...Object.fromEntries(request.headers), Authorization: `Bearer ${this.auth.token}` },
      });
    }

    if (this.beforeRequest) {
      request = this.beforeRequest(request);
    }

    return request;
  }
}
