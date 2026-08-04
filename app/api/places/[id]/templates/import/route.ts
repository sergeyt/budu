import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin, requireUser } from "@/lib/api-auth";
import { errorMiddleware, errors } from "@/lib/error";
import { importTemplatesMarkdown } from "@/lib/templateImport";

type Params = { id?: string };

const ImportBody = z.object({
  markdown: z.string(),
  /** When true (default), templates absent from the document are deleted. */
  prune: z.boolean().optional().default(true),
});

/**
 * Replace / sync a place's templates from a Markdown schedule document.
 * POST /api/places/:id/templates/import
 */
export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, placeId));
  if (!allowed) {
    throw errors.forbidden();
  }

  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    throw errors.placeNotFound();
  }

  const body = await req.json();
  const parsed = ImportBody.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("template import", parsed.error.flatten());
  }

  const outcome = await importTemplatesMarkdown(placeId, parsed.data.markdown, {
    prune: parsed.data.prune,
  });
  if (!outcome.ok) {
    throw errors.invalidPayload("template markdown", outcome.failure.errors);
  }

  return NextResponse.json(outcome.result);
});
