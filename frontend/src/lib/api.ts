const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: BodyInit | null;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  return fetch(buildApiUrl(path), {
    method: options.method,
    body: options.body,
    headers: options.headers,
    credentials: options.credentials ?? 'include',
  });
}
