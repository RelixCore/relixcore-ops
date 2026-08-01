import { prisma } from "./prisma";
import { effectiveRoles, combinedRoleLabel } from "./roles";
import { totalItemCount } from "./checklists";

export type TeamChecklistProgress = {
  id: string;
  name: string;
  roleLabel: string;
  done: number;
  total: number;
};

export async function getTeamChecklistProgress(date: string): Promise<TeamChecklistProgress[]> {
  const [users, doneEntries] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { secondaryRoles: true } }),
    prisma.checklistEntry.findMany({ where: { date, completed: true }, select: { userId: true } }),
  ]);

  const doneByUser = new Map<string, number>();
  for (const e of doneEntries) {
    doneByUser.set(e.userId, (doneByUser.get(e.userId) ?? 0) + 1);
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    roleLabel: combinedRoleLabel(
      u.role,
      u.secondaryRoles.map((r) => r.role)
    ),
    done: doneByUser.get(u.id) ?? 0,
    total: totalItemCount(effectiveRoles(u)),
  }));
}
