import { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type FieldDiff = { field: string; from: string; to: string };

export type LogActivityInput = {
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  details?: FieldDiff[];
};

// Never let an audit-trail write take down the real mutation it's attached to.
export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        details: input.details ? (input.details as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write activity log", err);
  }
}

// Generic before/after differ — returns only the fields that actually changed.
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: { key: keyof T; label: string; format?: (value: T[keyof T]) => string }[]
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const defaultFormat = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

  for (const f of fields) {
    const beforeVal = before[f.key];
    const afterVal = after[f.key];
    if (beforeVal === afterVal) continue;
    if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;

    const format = f.format ?? defaultFormat;
    diffs.push({
      field: f.label,
      from: format(beforeVal),
      to: format(afterVal),
    });
  }

  return diffs;
}

export const ACTION_LABELS: Record<ActivityAction, string> = {
  LOGIN: "Logged in",
  LOGOUT: "Logged out",
  LEAD_CREATED: "Created lead",
  LEAD_UPDATED: "Updated lead",
  LEAD_DELETED: "Deleted lead",
  TEAM_MEMBER_CREATED: "Added team member",
  TEAM_MEMBER_UPDATED: "Updated team member",
  TEAM_MEMBER_DELETED: "Removed team member",
  CHECKLIST_ITEM_COMPLETED: "Completed checklist item",
  CHECKLIST_ITEM_UNCOMPLETED: "Unchecked checklist item",
  ACTIVITY_LOG_PURGED: "Purged activity log",
};

export type ActivityCategory = "LOGIN" | "LEADS" | "TEAM" | "CHECKLIST" | "SYSTEM";

export const ACTION_CATEGORIES: Record<ActivityAction, ActivityCategory> = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGIN",
  LEAD_CREATED: "LEADS",
  LEAD_UPDATED: "LEADS",
  LEAD_DELETED: "LEADS",
  TEAM_MEMBER_CREATED: "TEAM",
  TEAM_MEMBER_UPDATED: "TEAM",
  TEAM_MEMBER_DELETED: "TEAM",
  CHECKLIST_ITEM_COMPLETED: "CHECKLIST",
  CHECKLIST_ITEM_UNCOMPLETED: "CHECKLIST",
  ACTIVITY_LOG_PURGED: "SYSTEM",
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  LOGIN: "Login / Logout",
  LEADS: "Lead Tracker",
  TEAM: "Team",
  CHECKLIST: "Daily Checklist",
  SYSTEM: "System",
};

export const ACTIONS_BY_CATEGORY: Record<ActivityCategory, ActivityAction[]> = (
  Object.keys(ACTION_LABELS) as ActivityAction[]
).reduce(
  (acc, action) => {
    acc[ACTION_CATEGORIES[action]].push(action);
    return acc;
  },
  { LOGIN: [], LEADS: [], TEAM: [], CHECKLIST: [], SYSTEM: [] } as Record<ActivityCategory, ActivityAction[]>
);

export function formatDetails(details: Prisma.JsonValue | null | undefined): string {
  if (!Array.isArray(details)) return "—";
  return (details as unknown as FieldDiff[]).map((d) => `${d.field}: ${d.from} → ${d.to}`).join("; ");
}
