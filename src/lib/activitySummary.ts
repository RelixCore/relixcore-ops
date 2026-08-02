import { prisma } from "./prisma";
import { dateKeyToRange } from "./date";
import { getTeamChecklistProgress } from "./checklistProgress";

export type TeamActivityRow = {
  id: string;
  name: string;
  roleLabel: string;
  checklistDone: number;
  checklistTotal: number;
  loginCount: number;
  firstLoginAt: Date | null;
  lastActivityAt: Date | null;
  eventCount: number;
};

// Per-team-member activity for a single local-calendar day: did they log in,
// how many events did they generate, and how much of that day's checklist
// did they complete. Backs the "who's actually working" summary panel.
export async function getTeamActivityForDate(date: string): Promise<TeamActivityRow[]> {
  const { start, end } = dateKeyToRange(date);

  const [progress, logs] = await Promise.all([
    getTeamChecklistProgress(date),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: start, lt: end }, actorId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { actorId: true, action: true, createdAt: true },
    }),
  ]);

  const byActor = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!log.actorId) continue;
    const arr = byActor.get(log.actorId);
    if (arr) arr.push(log);
    else byActor.set(log.actorId, [log]);
  }

  return progress.map((p) => {
    const events = byActor.get(p.id) ?? [];
    const logins = events.filter((e) => e.action === "LOGIN");
    return {
      id: p.id,
      name: p.name,
      roleLabel: p.roleLabel,
      checklistDone: p.done,
      checklistTotal: p.total,
      loginCount: logins.length,
      firstLoginAt: logins[0]?.createdAt ?? null,
      lastActivityAt: events.length > 0 ? events[events.length - 1].createdAt : null,
      eventCount: events.length,
    };
  });
}
