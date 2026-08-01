"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return "Enter your email and password.";
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return "No account found with that email.";
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return "Incorrect password.";
  }

  await createSession(user.id);
  redirect("/");
}
