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
