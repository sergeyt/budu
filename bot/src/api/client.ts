import { loadConfig } from "@/config.ts";

type HttpInit = Omit<RequestInit, "body"> & { body?: unknown };

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  init: HttpInit = {},
): Promise<T> {
  const cfg = loadConfig();
  const { body, headers, ...rest } = init;
  const res = await fetch(`${cfg.API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.BOT_INTERNAL_TOKEN}`,
      ...(headers ?? {}),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const err = (await res.json()) as { error?: string; code?: string };
      if (err.error) {
        message = err.error;
      }
      code = err.code;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
