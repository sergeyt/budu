# Next.js web app (e2e / local compose). Build context: repo root.
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.23.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY prisma prisma
COPY prisma.config.ts ./
# prisma.config.ts requires DATABASE_URL at load time; unused during generate.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV NEXT_PUBLIC_PASSWORD_LOGIN=1
ENV AUTH_PASSWORD_LOGIN=1
RUN pnpm exec prisma generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app /app
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec next start -p 3000"]
