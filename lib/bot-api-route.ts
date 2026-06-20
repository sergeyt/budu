import { requireBotInternalToken } from "@/lib/bot-api-auth";
import { errorMiddleware, type RouteContext } from "@/lib/error";

type ParamBase = Record<string, unknown>;
type Route<TParams extends ParamBase = ParamBase> = (
  req: Request,
  ctx: RouteContext<TParams>,
) => Promise<unknown>;

/** Wraps a handler with bot-token auth + standard error JSON. */
export function botRoute<TParams extends ParamBase = ParamBase>(
  fn: Route<TParams>,
) {
  return errorMiddleware<TParams>(async (req, ctx) => {
    requireBotInternalToken(req);
    return fn(req, ctx);
  });
}
