"use server";

import { redirect } from "next/navigation";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await logActivity({ actorId: user.id, actorName: user.name, action: "LOGOUT" });
  }
  await destroySession();
  redirect("/login");
}
