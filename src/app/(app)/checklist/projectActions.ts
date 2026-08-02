"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import { todayKey } from "@/lib/date";
import { logActivity } from "@/lib/activityLog";

// "self" assigns only to the current user (everyone can do this). "everyone"
// and a specific user id are admin/growth-lead only — same rule as
// addCustomTaskAction in actions.ts.
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
