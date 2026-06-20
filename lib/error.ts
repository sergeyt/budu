import { NextResponse } from "next/server";
import { log } from "./log";

type HttpErrorOptions = {
  code?: string;
  details?: unknown;
  cause?: unknown;
};

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, opts?: HttpErrorOptions) {
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = this.constructor.name;
    this.status = status;
    this.code = opts?.code;
    this.details = opts?.details;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", opts?: HttpErrorOptions) {
    super(404, message, opts);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", opts?: HttpErrorOptions) {
    super(400, message, opts);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", opts?: HttpErrorOptions) {
    super(403, message, opts);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", opts?: HttpErrorOptions) {
    super(401, message, opts);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", opts?: HttpErrorOptions) {
    super(409, message, opts);
  }
}

type ParamBase = Record<string, unknown>;

export type RouteContext<TParams extends ParamBase = ParamBase> = {
  params: TParams | Promise<TParams>;
};

type Route<TParams extends ParamBase = ParamBase> = (
  req: Request,
  ctx: RouteContext<TParams>,
) => Promise<unknown>;

type WrappedRoute<TParams extends ParamBase = ParamBase> = (
  req: Request,
  ctx?: RouteContext<TParams>,
) => Promise<NextResponse>;

function statusFromError(err: unknown): number | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status?: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return undefined;
}

function messageFromError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return "Internal Server Error";
}

/**
 * Error catalog. Throw `errors.foo(...)` instead of constructing HttpError
 * subclasses inline so that:
 *   - All user-facing messages live in one place (easier to audit, translate,
 *     or reword without spelunking through route handlers).
 *   - Every error has a stable machine-readable `code` for clients/logs.
 *   - Parameterized errors get type-checked params at the call site.
 *
 * Add new entries here rather than constructing HttpError subclasses inline.
 */
export const errors = {
  // ===== Auth =====
  unauthorized: () =>
    new UnauthorizedError("Unauthorized", { code: "UNAUTHORIZED" }),
  superAdminRequired: () =>
    new UnauthorizedError("Super admin role required", {
      code: "SUPER_ADMIN_REQUIRED",
    }),
  forbidden: () => new ForbiddenError("Forbidden", { code: "FORBIDDEN" }),
  badWebhookSecret: () =>
    new ForbiddenError("Bad secret provided", { code: "BAD_WEBHOOK_SECRET" }),
  badBotInternalToken: () =>
    new ForbiddenError("Bad bot internal token", {
      code: "BAD_BOT_INTERNAL_TOKEN",
    }),
  botApiNotConfigured: () =>
    new ForbiddenError("Bot internal API is not configured", {
      code: "BOT_API_NOT_CONFIGURED",
    }),

  // ===== Validation =====
  missingParam: (name: string) =>
    new BadRequestError(`${name} is required`, {
      code: "MISSING_PARAM",
      details: { param: name },
    }),
  invalidPayload: (resource: string, details?: unknown) =>
    new BadRequestError(`Invalid ${resource} payload`, {
      code: "INVALID_PAYLOAD",
      details,
    }),
  invalidStartAt: () =>
    new BadRequestError("Invalid startAt date", { code: "INVALID_START_AT" }),

  // ===== Events =====
  eventNotFound: () =>
    new NotFoundError("Event not found", { code: "EVENT_NOT_FOUND" }),
  registrationWindowClosed: () =>
    new BadRequestError(
      "Registration opens 24h before start and closes at start.",
      { code: "REGISTRATION_WINDOW_CLOSED" },
    ),
  eventAndReserveFull: () =>
    new ConflictError("Event and reserve list are full", {
      code: "EVENT_AND_RESERVE_FULL",
    }),
  alreadyRegistered: () =>
    new ConflictError("Already registered for this event", {
      code: "ALREADY_REGISTERED",
    }),

  // ===== Places =====
  placeNotFound: () =>
    new NotFoundError("Place not found", { code: "PLACE_NOT_FOUND" }),
  noEventInPlace: () =>
    new NotFoundError("No event in the given place", {
      code: "NO_EVENT_IN_PLACE",
    }),
  invalidTimezone: (zone: string) =>
    new BadRequestError(`Invalid IANA timezone: ${zone}`, {
      code: "INVALID_TIMEZONE",
      details: { zone },
    }),

  // ===== Templates =====
  templateNotFound: () =>
    new NotFoundError("Event template not found", {
      code: "TEMPLATE_NOT_FOUND",
    }),

  // ===== Users =====
  userNotFound: () =>
    new NotFoundError("User not found", { code: "USER_NOT_FOUND" }),
} as const;

export type ErrorKey = keyof typeof errors;

export function errorMiddleware<TParams extends ParamBase = ParamBase>(
  fn: Route<TParams>,
): WrappedRoute<TParams> {
  return async (req, ctxFromNext) => {
    try {
      const ctx: RouteContext<TParams> =
        ctxFromNext ?? ({ params: {} as TParams } as RouteContext<TParams>);

      const resp = await fn(req, ctx);
      if (resp === undefined) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      if (resp instanceof NextResponse) {
        return resp;
      }
      return NextResponse.json(resp, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.code,
            details: err.details,
          },
          { status: err.status },
        );
      }

      log.error("Unhandled API route error", err, {
        url: req.url,
        method: req.method,
      });

      return NextResponse.json(
        { error: messageFromError(err) },
        { status: statusFromError(err) ?? 500 },
      );
    }
  };
}
