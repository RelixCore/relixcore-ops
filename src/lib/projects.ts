import { prisma } from "./prisma";
import { todayKey, dateKeyToRange, shiftDateKey, enumerateDateKeys, daysBetweenKeys } from "./date";
import type { ChecklistProject, ChecklistProjectCheckIn } from "@prisma/client";

export type ProjectUrgencyLevel = "green" | "amber" | "red";

export type ProjectUrgency = {
  level: ProjectUrgencyLevel;
  label: string;
  daysRemaining: number;
};

// Green while there's comfortable runway, amber inside a week of the deadline,
// red once it's down to the wire, due today, or overdue.
export function projectUrgency(dueDate: string, today: string = todayKey()): ProjectUrgency {
  const daysRemaining = daysBetweenKeys(today, dueDate);

  if (daysRemaining < 0) {
    return {
      level: "red",
      label: daysRemaining === -1 ? "1 day overdue" : `${-daysRemaining} days overdue`,
      daysRemaining,
    };
  }
  if (daysRemaining === 0) return { level: "red", label: "Due today", daysRemaining };
  if (daysRemaining <= 2) {
    return { level: "red", label: `Due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`, daysRemaining };
  }
  if (daysRemaining <= 5) return { level: "amber", label: `Due in ${daysRemaining} days`, daysRemaining };
  return { level: "green", label: `Due in ${daysRemaining} days`, daysRemaining };
}

export type ProjectView = {
  id: string;
  title: string;
  startDate: string;
  dueDate: string;
  completed: boolean;
  assignedByName: string;
  checkedInToday: boolean;
  urgency: ProjectUrgency;
  missedDates: string[];
};

type ProjectWithCheckIns = ChecklistProject & { checkIns: ChecklistProjectCheckIn[] };

function toProjectView(project: ProjectWithCheckIns, date: string): ProjectView {
  const checkedDates = new Set(project.checkIns.map((c) => c.date));
  const yesterday = shiftDateKey(date, -1);
  const missedDates = enumerateDateKeys(project.startDate, yesterday).filter((d) => !checkedDates.has(d));

  return {
    id: project.id,
    title: project.title,
    startDate: project.startDate,
    dueDate: project.dueDate,
    completed: project.completed,
    assignedByName: project.assignedByName,
    checkedInToday: checkedDates.has(date),
    urgency: projectUrgency(project.dueDate, date),
    missedDates,
  };
}

// Projects visible on a user's Checklist for `date`: started on/before that
// day, and either still open or just completed on that same day (so checking
// the final box doesn't yank the card away mid-day).
export async function getActiveProjectsForUser(userId: string, date: string = todayKey()): Promise<ProjectView[]> {
  const { start: dayStart, end: dayEnd } = dateKeyToRange(date);

  const projects = await prisma.checklistProject.findMany({
    where: {
      assigneeId: userId,
      startDate: { lte: date },
      OR: [{ completed: false }, { completedAt: { gte: dayStart, lt: dayEnd } }],
    },
    include: { checkIns: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return projects.map((p) => toProjectView(p, date));
}

export type MissedCheckInSummary = {
  assigneeId: string;
  assigneeName: string;
  projectId: string;
  projectTitle: string;
  missedDates: string[];
};

// Cross-team rollup of anyone with a gap in their daily check-ins on an active
// project — backs the Admin/Growth Lead "who's fallen behind" panel.
export async function getTeamMissedCheckIns(date: string = todayKey()): Promise<MissedCheckInSummary[]> {
  const { start: dayStart, end: dayEnd } = dateKeyToRange(date);

  const projects = await prisma.checklistProject.findMany({
    where: {
      startDate: { lte: date },
      OR: [{ completed: false }, { completedAt: { gte: dayStart, lt: dayEnd } }],
    },
    include: { checkIns: true, assignee: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: "asc" }],
  });

  const summaries: MissedCheckInSummary[] = [];
  for (const project of projects) {
    const view = toProjectView(project, date);
    if (view.missedDates.length > 0) {
      summaries.push({
        assigneeId: project.assigneeId,
        assigneeName: project.assignee.name,
        projectId: project.id,
        projectTitle: project.title,
        missedDates: view.missedDates,
      });
    }
  }
  return summaries;
}

export function formatMissedDates(missedDates: string[]): string {
  if (missedDates.length === 0) return "";
  if (missedDates.length === 1) return `Missed check-in on ${missedDates[0]}`;
  return `Missed check-ins on ${missedDates.length} days (most recently ${missedDates[missedDates.length - 1]})`;
}
