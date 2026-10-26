const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function jsonFetch(input, init) {
  let request = new Request(input, init);

  if (init?.body && !(request.headers.get('Content-Type') || '').includes('json')) {
    request = new Request(request, { headers: { ...Object.fromEntries(request.headers), ...JSON_HEADERS } });
  }

  const response = await fetch(request);
  const ok = response.ok;

  let body = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  return { ok, status: response.status, body };
}

export class ServiceClient {
  constructor(baseUrl, auth, beforeRequest) {
    this.baseUrl = baseUrl;
    this.auth = auth;
    this.beforeRequest = beforeRequest;
  }

  async get(path, params) {
    const url = new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const request = this.build(url, { method: 'GET' });
    return jsonFetch(request);
  }

  async post(path, body) {
    return jsonFetch(
      this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async put(path, body) {
    return jsonFetch(
      this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), {
        method: 'PUT',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async patch(path, body) {
    return jsonFetch(
      this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), {
        method: 'PATCH',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async delete(path) {
    return jsonFetch(this.build(new URL(`${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`), { method: 'DELETE' }));
  }

  build(url, init) {
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
