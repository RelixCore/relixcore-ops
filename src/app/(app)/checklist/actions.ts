"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
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
