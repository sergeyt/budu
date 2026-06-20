export async function sendMessage(chatId: string, text: string) {
  const base = process.env.MAX_API_URL;
  const token = process.env.MAX_BOT_TOKEN;
  if (!base || !token) {
    throw new Error("MAX API not configured");
  }

  // TODO adjust placeholder according to the MAX API
  const res = await fetch(`${base}/${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MAX send failed: ${res.status} ${body}`);
  }
}
