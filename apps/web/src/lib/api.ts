import type {
  LanguageInfo,
  ProblemDetail,
  ProblemSummary,
  RunRequest,
  SubmissionView,
  SubmitProblemRequest,
} from '@arena/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Error from the API, with its HTTP status and machine-readable code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {'Content-Type': 'application/json', ...init.headers},
  });
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as {error?: {code?: string; message?: string}} | null)?.error;
    throw new ApiError(res.status, error?.code ?? 'error', error?.message ?? res.statusText);
  }
  return body as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {method: 'POST', body: JSON.stringify(body)});

export interface ApiKeyView {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Typed calls to the Arena API. Cookies carry the session. */
export const api = {
  languages: () => request<LanguageInfo[]>('/v1/languages'),
  run: (body: RunRequest) => post<SubmissionView>('/v1/run', body),
  problems: () => request<ProblemSummary[]>('/v1/problems'),
  problem: (slug: string) => request<ProblemDetail>(`/v1/problems/${encodeURIComponent(slug)}`),
  submitProblem: (slug: string, body: SubmitProblemRequest) =>
    post<SubmissionView>(`/v1/problems/${encodeURIComponent(slug)}/submit?wait=false`, body),
  submissions: (limit = 50) => request<SubmissionView[]>(`/v1/submissions?limit=${limit}`),
  submission: (token: string) => request<SubmissionView>(`/v1/submissions/${token}`),
  eventsUrl: (token: string) => `${API_URL}/v1/submissions/${token}/events`,
  apiKeys: () => request<ApiKeyView[]>('/v1/api-keys'),
  createApiKey: (name: string) => post<ApiKeyView & {key: string}>('/v1/api-keys', {name}),
  revokeApiKey: (id: string) => request<void>(`/v1/api-keys/${id}`, {method: 'DELETE'}),
};
