// Single fetch helper. The session lives in an HttpOnly cookie, so no token is ever readable by page scripts.
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export interface SessionUser {
  full_name: string;
  role: 'CITIZEN' | 'DEPT_ADMIN' | 'SYS_ADMIN';
  department_id?: string;
  masked_id?: string;
  auth_provider: string;
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(path, {
    method: init.method ?? (hasBody ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('mahalink:session-expired'));
    throw new ApiError(res.status, data.error ?? 'REQUEST_FAILED', data.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}
