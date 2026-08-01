"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { todayKey } from "@/lib/date";

export async function toggleChecklistItemAction(itemKey: string, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const date = todayKey();

  await prisma.checklistEntry.upsert({
    where: { userId_date_itemKey: { userId: user.id, date, itemKey } },
    update: { completed },
    create: { userId: user.id, date, itemKey, completed },
  });

  revalidatePath("/checklist");
}
