import { useAuthStore } from '../store/authStore';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, string[] | undefined>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { skipAuth?: boolean } = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    meta?: Record<string, unknown>;
    error?: {
      code?: string;
      message?: string;
      details?: Record<string, string[] | undefined>;
    };
  };

  if (!response.ok) {
    if (response.status === 401 && !options.skipAuth) {
      useAuthStore.getState().logout();
    }
    const detailMsgs = payload.error?.details
      ? Object.entries(payload.error.details)
          .flatMap(([k, arr]) => (arr ?? []).map((m) => `${k}: ${m}`))
          .join('; ')
      : '';
    const baseMsg = payload.error?.message ?? `Lỗi máy chủ (HTTP ${response.status})`;
    throw new ApiClientError(
      response.status,
      payload.error?.code ?? 'API_ERROR',
      detailMsgs ? `${baseMsg} (${detailMsgs})` : baseMsg,
      payload.error?.details,
    );
  }

  return {
    data: payload.data as T,
    meta: payload.meta,
  };
}
