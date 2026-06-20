export type HttpInit = Omit<RequestInit, "body"> & { body?: unknown };

/** How the client authenticates each request. Omit for cookie/session (browser). */
export type ApiClientAuth =
  | { kind: "bearer"; token: string }
  | { kind: "headers"; headers: Record<string, string> };

export type ApiClientOptions = {
  /** Prepended to relative paths. Empty string = same origin. */
  baseUrl?: string;
  auth?: ApiClientAuth;
  credentials?: RequestCredentials;
  /** Inject for tests. Defaults to global `fetch`. */
  fetch?: typeof fetch;
};

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

export class ApiClient {
  private readonly baseUrl: string;
  private readonly auth?: ApiClientAuth;
  private readonly credentials?: RequestCredentials;
  private readonly fetchFn: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.auth = options.auth;
    this.credentials = options.credentials;
    this.fetchFn = options.fetch ?? fetch;
  }

  async fetch<T>(path: string, init: HttpInit = {}): Promise<T> {
    const { body, headers, ...rest } = init;
    const res = await this.fetchFn(this.resolveUrl(path), {
      ...rest,
      credentials: rest.credentials ?? this.credentials,
      headers: this.buildHeaders(headers),
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

  private resolveUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const base = this.baseUrl.replace(/\/$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${base}${suffix}`;
  }

  private buildHeaders(extra?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (this.auth?.kind === "bearer") {
      headers.authorization = `Bearer ${this.auth.token}`;
    } else if (this.auth?.kind === "headers") {
      Object.assign(headers, this.auth.headers);
    }

    if (extra) {
      const merged = new Headers(extra);
      merged.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    }

    return headers;
  }
}
