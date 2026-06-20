import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { deriveWebhookSecretToken } from "../src/webhookSecret.ts";

Deno.test("deriveWebhookSecretToken: stable hex token", async () => {
  const token = "test-internal-token-00000000";
  const a = await deriveWebhookSecretToken(token);
  const b = await deriveWebhookSecretToken(token);
  assertEquals(a, b);
  assertEquals(a.length, 32);
  assertEquals(/^[a-f0-9]+$/.test(a), true);
});

Deno.test("deriveWebhookSecretToken: differs per internal token", async () => {
  const a = await deriveWebhookSecretToken("token-a-000000000000000");
  const b = await deriveWebhookSecretToken("token-b-000000000000000");
  assertEquals(a === b, false);
});
