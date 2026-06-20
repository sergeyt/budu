# @budu/api-client

Shared HTTP client for **budu** — used by the Next.js web app and the Deno
Telegram bot.

## Layers

```
client.ts          ApiClient + ApiError (transport, auth via constructor)
types/web.ts       Wire DTOs for public /api/*
types/bot.ts       Wire DTOs + date parsers for /api/internal/bot/*
web/               createWebApi(client)  → places, events, templates
bot/               createBotApi(client)  → places, events, users, …
```

## Usage

**Browser** (session cookies):

```typescript
import { ApiClient } from "@budu/api-client";
import { createWebApi } from "@budu/api-client/web";

const api = createWebApi(new ApiClient({ credentials: "same-origin" }));
await api.events.register(eventId);
```

**Bot** (Bearer `BOT_INTERNAL_TOKEN`):

```typescript
import { ApiClient } from "@budu/api-client";
import { createBotApi } from "@budu/api-client/bot";

const botApi = createBotApi(
  new ApiClient({
    baseUrl: "https://app.example",
    auth: { kind: "bearer", token: process.env.BOT_INTERNAL_TOKEN! },
  }),
);
await botApi.events.findById(id);
```

Import only the surface you need — the bot never loads `createWebApi`.

## Extending

Add a route module under `web/` or `bot/`, export a `create*Api(client)`
factory, and register it in the matching `index.ts` composer.
