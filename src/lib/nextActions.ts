import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { canViewDashboard } from "./roles";
import { dateKeyToRange, todayKey } from "./date";

export type NextActionState = "overdue" | "due_today" | "upcoming";

export type DueNextAction = {
  id: string;
  leadCode: string;
  companyName: string;
  nextAction: string;
  ownerId: string | null;
  ownerName: string | null;
  state: NextActionState;
  statusLabel: string;
};

export function dueStatus(nextActionDate: Date): { state: NextActionState; statusLabel: string } {
  const { start: todayStart } = dateKeyToRange(todayKey());
  const actionDay = new Date(
    nextActionDate.getFullYear(),
    nextActionDate.getMonth(),
    nextActionDate.getDate()
  );
  const daysOverdue = Math.round((todayStart.getTime() - actionDay.getTime()) / 86400000);

  if (daysOverdue === 0) return { state: "due_today", statusLabel: "Due today" };
  if (daysOverdue < 0) {
    const daysAway = -daysOverdue;
    return { state: "upcoming", statusLabel: daysAway === 1 ? "Due in 1 day" : `Due in ${daysAway} days` };
  }
  return {
    state: "overdue",
    statusLabel: daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`,
  };
}

// Leads whose next action is due today or overdue and hasn't been marked
// done. Admin/Growth Lead see every due lead; everyone else sees only leads
// they own — backs the flashing notification bell.
export async function getDueNextActions(user: {
  id: string;
  roles: Role[];
}): Promise<DueNextAction[]> {
  const isManager = canViewDashboard(user.roles);
  const { end: endOfToday } = dateKeyToRange(todayKey());

  const leads = await prisma.lead.findMany({
    where: {
      nextAction: { not: null },
      nextActionDate: { lt: endOfToday },
      nextActionDone: false,
      ...(isManager ? {} : { ownerId: user.id }),
    },
    include: { owner: { select: { name: true } } },
    orderBy: { nextActionDate: "asc" },
  });

  return leads.map((lead) => {
    const { state, statusLabel } = dueStatus(lead.nextActionDate as Date);
    return {
      id: lead.id,
      leadCode: lead.leadCode,
      companyName: lead.companyName,
      nextAction: lead.nextAction as string,
      ownerId: lead.ownerId,
      ownerName: lead.owner?.name ?? null,
      state,
      statusLabel,
    };
  });
}
