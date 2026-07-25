# budu Telegram bot — Deno only (calls Next.js /api/internal/bot/*).
# Build context: repo root (see docker-compose.yml).
FROM denoland/deno:debian

WORKDIR /app

COPY packages/api-client packages/api-client
COPY bot bot

WORKDIR /app/bot

RUN deno cache --allow-import --unstable-sloppy-imports src/main.ts

EXPOSE 8080

# Secrets via env_file / environment (see docker-compose.yml).
CMD ["deno", "run", "--allow-env", "--allow-net", "--allow-read", "--allow-import", "--unstable-sloppy-imports", "src/main.ts"]
