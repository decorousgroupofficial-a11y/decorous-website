const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(payload.message ?? `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export const apiClient = {
  get: <T = unknown,>(path: string) => request<T>('GET', path),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T = any,>(path: string, body?: unknown) => request<T>('POST', path, body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T = any,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  del: <T = any,>(path: string) => request<T>('DELETE', path),
};
