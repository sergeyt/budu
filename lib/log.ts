import * as Sentry from "@sentry/nextjs";

export type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV !== "production";

/**
 * Thin Sentry wrapper used across server code.
 *
 * - `error`  — captures the exception in Sentry; mirrors to console in dev.
 * - `warn`   — captures a warning-level message in Sentry; mirrors to console in dev.
 * - `info`   — adds a Sentry breadcrumb (no event); mirrors to console in dev.
 * - `breadcrumb` — fire-and-forget structured trail attached to the next captured event.
 */
export const log = {
  error(message: string, err: unknown, context?: LogContext) {
    Sentry.captureException(err, {
      extra: { message, ...(context ?? {}) },
    });
    if (isDev) {
      console.error(message, err, context ?? "");
    }
  },

  warn(message: string, context?: LogContext) {
    Sentry.captureMessage(message, {
      level: "warning",
      extra: context,
    });
    if (isDev) {
      console.warn(message, context ?? "");
    }
  },

  info(message: string, context?: LogContext) {
    Sentry.addBreadcrumb({
      category: "log",
      level: "info",
      message,
      data: context,
    });
    if (isDev) {
      console.log(message, context ?? "");
    }
  },

  breadcrumb(message: string, context?: LogContext) {
    Sentry.addBreadcrumb({
      category: "log",
      level: "debug",
      message,
      data: context,
    });
  },
};
