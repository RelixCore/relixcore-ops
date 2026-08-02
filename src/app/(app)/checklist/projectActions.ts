"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import { todayKey } from "@/lib/date";
import { logActivity } from "@/lib/activityLog";

// "self" assigns only to the current user (everyone can do this). Any other
// checked box (a specific user id, or several at once) is admin/growth-lead
// only — same rule as addCustomTaskAction in actions.ts. Each checked person
// gets their own ChecklistProject row, so check-ins/completion are tracked
// independently per assignee.
export async function addProjectAction(_prevState: string | undefined, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return "Project title is required.";

  const dueDate = String(formData.get("dueDate") ?? "").trim();
  if (!dueDate) return "Due date is required.";

  const startDate = todayKey();
  if (dueDate < startDate) return "Due date can't be in the past.";

  const isManager = canManageTeam(user.roles);
  const rawTargets = formData.getAll("assigneeId").map(String);

  let assigneeIds: string[];
  let assignmentSummary: string;

  if (!isManager) {
    assigneeIds = [user.id];
    assignmentSummary = "Self";
  } else {
    const targets = new Set(rawTargets.filter(Boolean));
    if (targets.size === 0) return "Select at least one person to assign this project to.";

    const includesSelf = targets.delete("self");
    const specificIds = [...targets];

    const found =
      specificIds.length > 0
        ? await prisma.user.findMany({ where: { id: { in: specificIds } }, select: { id: true, name: true } })
        : [];
    if (found.length !== specificIds.length) return "One or more selected team members no longer exist.";

    assigneeIds = [...(includesSelf ? [user.id] : []), ...found.map((u) => u.id)];
    const names = [...(includesSelf ? [user.name] : []), ...found.map((u) => u.name)];
    assignmentSummary =
      names.length === 1 ? names[0] : `${names.length} people (${names.slice(0, 3).join(", ")}${names.length > 3 ? ", …" : ""})`;
  }

  await prisma.checklistProject.createMany({
    data: assigneeIds.map((assigneeId) => ({
      title,
      startDate,
      dueDate,
      assigneeId,
      assignedById: user.id,
      assignedByName: user.name,
    })),
  });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    action: "PROJECT_ASSIGNED",
    entityType: "ChecklistProject",
    entityLabel: title,
    details: [
      { field: "Assigned To", from: "—", to: assignmentSummary },
      { field: "Due", from: "—", to: dueDate },
    ],
  });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

// A daily attestation that the assignee actually worked on the project today
// — distinct from marking the whole project done. Only the assignee can check
// themselves in; it's a personal "yes, I touched this" signal, not something a
// manager can do on someone else's behalf.
export async function checkInProjectAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const project = await prisma.checklistProject.findUnique({ where: { id: projectId } });
  if (!project) return;
  if (project.assigneeId !== user.id) {
    throw new Error("Not authorized to check in on this project.");
  }

  const date = todayKey();
  await prisma.checklistProjectCheckIn.upsert({
    where: { projectId_date: { projectId, date } },
    update: {},
    create: { projectId, date },
  });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    action: "PROJECT_CHECKED_IN",
    entityType: "ChecklistProject",
    entityId: projectId,
    entityLabel: project.title,
  });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function completeProjectAction(projectId: string, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const project = await prisma.checklistProject.findUnique({ where: { id: projectId } });
  if (!project) return;

  const isManager = canManageTeam(user.roles);
  if (project.assigneeId !== user.id && !isManager) {
    throw new Error("Not authorized to update this project.");
  }

  await prisma.checklistProject.update({
    where: { id: projectId },
    data: { completed, completedAt: completed ? new Date() : null },
  });

  if (completed) {
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      action: "PROJECT_COMPLETED",
      entityType: "ChecklistProject",
      entityId: projectId,
      entityLabel: project.title,
    });
  }

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  const project = await prisma.checklistProject.findUnique({ where: { id: projectId } });
  if (!project) return;

  const isManager = canManageTeam(user.roles);
  const isAssignee = project.assigneeId === user.id;
  const isAssigner = project.assignedById === user.id;
  if (!isManager && !isAssignee && !isAssigner) {
    throw new Error("Not authorized to remove this project.");
  }

  await prisma.checklistProject.delete({ where: { id: projectId } });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    action: "PROJECT_DELETED",
    entityType: "ChecklistProject",
    entityId: projectId,
    entityLabel: project.title,
  });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}
