"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import { logActivity } from "@/lib/activityLog";
import { dateKeyToRange } from "@/lib/date";

async function requireActivityManager() {
  const user = await getCurrentUser();
  if (!user || !canManageTeam(user.roles)) {
    throw new Error("Not authorized to manage the activity log.");
  }
  return user;
}

export async function purgeActivityLogAction(formData: FormData) {
  const actor = await requireActivityManager();

  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();

  if (!from && !to) {
    redirect(`/activity?error=${encodeURIComponent("Pick at least a from or to date to delete records.")}`);
  }

  const result = await prisma.activityLog.deleteMany({
    where: {
      createdAt: {
        ...(from ? { gte: dateKeyToRange(from).start } : {}),
        ...(to ? { lt: dateKeyToRange(to).end } : {}),
      },
    },
  });

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    action: "ACTIVITY_LOG_PURGED",
    details: [
      { field: "Range", from: from || "beginning", to: to || "now" },
      { field: "Records Deleted", from: "—", to: String(result.count) },
    ],
  });

  revalidatePath("/activity");
  redirect("/activity");
}
