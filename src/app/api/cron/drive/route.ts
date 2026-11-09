import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { syncWatch } from "@/lib/drive";

export const maxDuration = 300;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  const actual = request.headers.get("authorization") ?? "";
  if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return new Response("Not authorized", { status: 401 });
  const watches = await prisma.driveWatch.findMany({ orderBy: { lastAttemptAt: "asc" }, take: 3, select: { id: true } });
  for (const watch of watches) await syncWatch(watch.id);
  return Response.json({ checked: watches.length });
}
