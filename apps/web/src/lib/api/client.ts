import { type ApiError } from "./types";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api/v1";

async function request<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string
): Promise<T> {
  const { headers: initHeaders, ...restInit } = init ?? {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (initHeaders) {
    const merged = new Headers(initHeaders as HeadersInit);
    merged.forEach((v, k) => { headers[k] = v; });
  }
  const res = await fetch(API_BASE + path, {
    headers,
    ...restInit,
  });

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json();

  if (!res.ok) {
    throw data as ApiError;
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string, accessToken?: string, init?: RequestInit) {
    return request<T>(path, { method: "GET", ...init }, accessToken);
  },

  post<T>(path: string, body?: unknown, accessToken?: string, init?: RequestInit) {
    return request<T>(
      path,
      {
        method: "POST",
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...init,
      },
      accessToken
    );
  },

  patch<T>(path: string, body?: unknown, accessToken?: string, init?: RequestInit) {
    return request<T>(
      path,
      {
        method: "PATCH",
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...init,
      },
      accessToken
    );
  },

  delete(path: string, accessToken?: string, init?: RequestInit) {
    return request<void>(path, { method: "DELETE", ...init }, accessToken);
  },
};
