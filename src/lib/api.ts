import type { ApiErrorShape, ApiSuccess } from "../../shared/contracts";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

function cookie(name: string): string | undefined {
  return document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("content-type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = cookie("learn_csrf");
    if (csrf) headers.set("x-csrf-token", decodeURIComponent(csrf));
  }
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: "same-origin" });
  const payload = await response.json().catch(() => null) as ApiSuccess<T> | ApiErrorShape | null;
  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : { code: "NETWORK_ERROR", message: "The server returned an unreadable response." };
    throw new ApiError(response.status, error.code, error.message, error.details);
  }
  return (payload as ApiSuccess<T>).data;
}

export function jsonBody(value: unknown): Pick<RequestInit, "body"> { return { body: JSON.stringify(value) }; }

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
export function formatRelative(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(value);
}
