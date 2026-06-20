import { describe, expect, it } from "vitest";
import { ApiClient, ApiError } from "./src/client";

describe("ApiClient", () => {
  it("sends Bearer auth when configured", async () => {
    let authHeader = "";
    const client = new ApiClient({
      baseUrl: "https://api.example",
      auth: { kind: "bearer", token: "secret" },
      fetch: async (_url, init) => {
        authHeader = new Headers(init?.headers).get("authorization") ?? "";
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });

    await client.fetch("/v1/x");
    expect(authHeader).toBe("Bearer secret");
  });

  it("omits Authorization without auth config", async () => {
    let authHeader: string | null = "unset";
    const client = new ApiClient({
      fetch: async (_url, init) => {
        authHeader = new Headers(init?.headers).get("authorization");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });

    await client.fetch("/api/places");
    expect(authHeader).toBeNull();
  });

  it("throws ApiError with server message and code", async () => {
    const client = new ApiClient({
      fetch: async () =>
        new Response(JSON.stringify({ error: "Forbidden", code: "FORBIDDEN" }), {
          status: 403,
        }),
    });

    await expect(client.fetch("/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Forbidden",
      code: "FORBIDDEN",
    } satisfies Partial<ApiError>);
  });

  it("joins baseUrl and path", async () => {
    let url = "";
    const client = new ApiClient({
      baseUrl: "https://host/",
      fetch: async (input) => {
        url = String(input);
        return new Response("{}", { status: 200 });
      },
    });

    await client.fetch("/api/internal/bot/events/1");
    expect(url).toBe("https://host/api/internal/bot/events/1");
  });
});
