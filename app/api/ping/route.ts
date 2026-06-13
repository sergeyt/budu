import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err) {
    // Return 200 to avoid retry storms from schedulers, but report to Sentry.
    log.error("keep-warm failed", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
