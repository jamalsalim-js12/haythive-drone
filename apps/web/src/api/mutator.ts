/**
 * Browser calls go to same-origin `/backend/*`, which Next rewrites to the Nest API.
 * That keeps the session cookie first-party so mobile Safari does not drop it.
 *
 * Local absolute `http://localhost:3001` still works for direct API access in dev.
 */
const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const API_BASE_URL =
  configured &&
  (configured.startsWith("http://localhost") ||
    configured.startsWith("http://127.0.0.1"))
    ? configured
    : "/backend";

export type ErrorType<Error> = Error;

export async function customFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(
    url.startsWith("http") ? url : `${API_BASE_URL}${url}`,
    {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...Object.fromEntries(new Headers(options.headers ?? {}).entries()),
      },
    },
  );

  const headers = response.headers;
  const text = await response.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const payload = data as { message?: string | string[] } | undefined;
    let message = response.statusText || "Request failed";
    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.message)) {
        message = payload.message.join(", ");
      } else if (typeof payload.message === "string") {
        message = payload.message;
      }
    }
    const error = new Error(message) as Error & {
      status?: number;
      data?: unknown;
    };
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return {
    data,
    status: response.status,
    headers,
  } as T;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
