/** Telegram `secret_token` must be `[A-Za-z0-9_-]`; derive a stable token from config. */
export async function deriveWebhookSecretToken(
  internalToken: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`budu:webhook:${internalToken}`),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 32);
}
