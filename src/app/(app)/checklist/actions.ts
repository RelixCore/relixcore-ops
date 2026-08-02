"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import { todayKey } from "@/lib/date";
import { logActivity } from "@/lib/activityLog";
import { CHECKLIST_TEMPLATES } from "@/lib/checklists";

function itemLabelFor(itemKey: string): string {
  const [role, indices] = itemKey.split(":");
  const [blockIndex, itemIndex] = (indices ?? "").split("-").map(Number);
  const block = CHECKLIST_TEMPLATES[role as Role]?.blocks[blockIndex];
  return block?.items[itemIndex] ?? itemKey;
}

export async function toggleChecklistItemAction(itemKey: string, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const date = todayKey();

  await prisma.checklistEntry.upsert({
    where: { userId_date_itemKey: { userId: user.id, date, itemKey } },
    update: { completed },
    create: { userId: user.id, date, itemKey, completed },
  });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    action: completed ? "CHECKLIST_ITEM_COMPLETED" : "CHECKLIST_ITEM_UNCOMPLETED",
    entityType: "ChecklistEntry",
    entityId: itemKey,
    entityLabel: itemLabelFor(itemKey),
  });

  revalidatePath("/checklist");
}

// "self" assigns only to the current user (everyone can do this). "everyone"
// and a specific user id are admin/growth-lead only.
export async function addCustomTaskAction(_prevState: string | undefined, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return "Task text is required.";

  const isManager = canManageTeam(user.roles);
  const target = String(formData.get("assigneeId") ?? "self");

  let assigneeIds: string[];
  let assignmentSummary: string;
  if (!isManager || target === "self" || !target) {
    assigneeIds = [user.id];
    assignmentSummary = "Self";
  } else if (target === "everyone") {
    const all = await prisma.user.findMany({ select: { id: true } });
    assigneeIds = all.map((u) => u.id);
    assignmentSummary = `Everyone (${assigneeIds.length})`;
  } else {
    const assignee = await prisma.user.findUnique({ where: { id: target }, select: { id: true, name: true } });
    if (!assignee) return "That team member no longer exists.";
    assigneeIds = [assignee.id];
    assignmentSummary = assignee.name;
  }

  const date = todayKey();

  await prisma.customChecklistTask.createMany({
    data: assigneeIds.map((assigneeId) => ({
      date,
      text,
      assigneeId,
      assignedById: user.id,
      assignedByName: user.name,
    })),
  });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    action: "CHECKLIST_TASK_ASSIGNED",
    entityType: "ChecklistTask",
    entityLabel: text,
    details: [{ field: "Assigned To", from: "—", to: assignmentSummary }],
  });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function toggleCustomTaskAction(taskId: string, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const task = await prisma.customChecklistTask.findUnique({ where: { id: taskId } });
  if (!task) return;

  const isManager = canManageTeam(user.roles);
  if (task.assigneeId !== user.id && !isManager) {
    throw new Error("Not authorized to update this task.");
  }

  await prisma.customChecklistTask.update({ where: { id: taskId }, data: { completed } });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    action: completed ? "CHECKLIST_ITEM_COMPLETED" : "CHECKLIST_ITEM_UNCOMPLETED",
    entityType: "ChecklistTask",
    entityId: taskId,
    entityLabel: task.text,
  });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function deleteCustomTaskAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const task = await prisma.customChecklistTask.findUnique({ where: { id: taskId } });
  if (!task) return;

  const isManager = canManageTeam(user.roles);
  const isAssignee = task.assigneeId === user.id;
  const isAssigner = task.assignedById === user.id;
  if (!isManager && !isAssignee && !isAssigner) {
    throw new Error("Not authorized to remove this task.");
  }

  await prisma.customChecklistTask.delete({ where: { id: taskId } });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}
