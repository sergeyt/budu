import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { log } from "./log";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const retryCount = Number(process.env.DATABASE_RETRY ?? 0);

function isTransient(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return (
    msg.includes("P1001") || // can't reach DB
    msg.includes("P1002") || // reached but timed out
    msg.includes("P2024") || // pool wait timeout
    /ECONNREFUSED|ETIMEDOUT|EOF|Connection terminated/i.test(msg)
  );
}

const retryExtension = Prisma.defineExtension((client) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (retryCount <= 0) {
            return query(args);
          }

          let attempt = 0;
          while (true) {
            try {
              return await query(args);
            } catch (err) {
              attempt++;
              if (attempt >= retryCount || !isTransient(err)) {
                throw err;
              }

              const delay = 200 * attempt;
              log.breadcrumb("Prisma transient error, retrying", {
                model,
                operation,
                attempt,
                retryCount,
                delayMs: delay,
              });
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        },
      },
    },
  }),
);

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Prisma 7: pass a driver adapter instead of datasourceUrl/datasources
  const adapter = new PrismaPg({ connectionString: url });

  const base = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return retryCount > 0 ? (base.$extends(retryExtension) as typeof base) : base;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Avoid multiple instances in dev (Next.js HMR)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
