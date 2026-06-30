import {
  ApiError,
  mapErrorCode,
  NETWORK_ERROR,
} from "@/lib/api-error";
import { FALLBACK_ERROR } from "@/lib/error-messages";
import { clearToken, getToken } from "@/lib/auth";
import type {
  ItemResponse,
  JobCreateResponse,
  JobSummary,
  TokenResponse,
} from "@/lib/types";

const API_BASE = "/api";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

function handleUnauthorized(): void {
  clearToken();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, "NETWORK_ERROR", 0);
  }

  if (response.ok) {
    return parseResponse<T>(response);
  }

  let payload: ApiErrorBody | null = null;
  try {
    payload = await parseResponse<ApiErrorBody>(response);
  } catch {
    payload = null;
  }

  const code = payload?.error?.code ?? "INTERNAL_ERROR";
  const backendMessage = payload?.error?.message ?? FALLBACK_ERROR;
  const message = mapErrorCode(code, backendMessage);
  const requestId = payload?.error?.request_id;

  if (response.status === 401) {
    handleUnauthorized();
  }

  throw new ApiError(message, code, response.status, requestId);
}

export const api = {
  register(email: string, password: string) {
    return request<TokenResponse>("/auth/register", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  },

  login(email: string, password: string) {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  },

  listJobs() {
    return request<JobSummary[]>("/jobs");
  },

  getJob(jobId: number) {
    return request<JobSummary>(`/jobs/${jobId}`);
  },

  listJobItems(jobId: number) {
    return request<ItemResponse[]>(`/jobs/${jobId}/items`);
  },

  submitJob(items: string[]) {
    return request<JobCreateResponse>("/jobs", {
      method: "POST",
      body: { items },
    });
  },

  retryItem(itemId: number) {
    return request<ItemResponse>(`/items/${itemId}/retry`, {
      method: "POST",
    });
  },
};
