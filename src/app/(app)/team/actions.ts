"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam, ROLE_LABELS } from "@/lib/roles";
import { logActivity, diffFields } from "@/lib/activityLog";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const baseUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  title: z.string().trim().optional(),
  role: z.nativeEnum(Role),
  avatarUrl: z.string().trim().optional(),
});

async function requireTeamManager() {
  const user = await getCurrentUser();
  if (!user || !canManageTeam(user.roles)) {
    throw new Error("Not authorized to manage the team.");
  }
  return user;
}

function parseSecondaryRoles(formData: FormData, primary: Role): Role[] {
  const roleValues = Object.values(Role) as string[];
  const selected = formData.getAll("secondaryRoles").map(String);
  return [...new Set(selected.filter((v) => roleValues.includes(v) && v !== primary))] as Role[];
}

export async function createUserAction(_prevState: string | undefined, formData: FormData) {
  const actor = await requireTeamManager();

  const parsed = baseUserSchema
    .extend({ password: z.string().min(6, "Temporary password must be at least 6 characters") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return "A team member with that email already exists.";
  }

  const secondaryRoles = parseSecondaryRoles(formData, data.role);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      title: data.title || null,
      role: data.role,
      avatarUrl: data.avatarUrl || null,
      passwordHash,
      secondaryRoles: { create: secondaryRoles.map((role) => ({ role })) },
    },
  });

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    action: "TEAM_MEMBER_CREATED",
    entityType: "User",
    entityId: created.id,
    entityLabel: created.name,
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  redirect("/team");
}

export async function updateUserAction(
  userId: string,
  _prevState: string | undefined,
  formData: FormData
) {
  const actor = await requireTeamManager();

  const parsed = baseUserSchema
    .extend({ password: z.preprocess(emptyToUndefined, z.string().min(6).optional()) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }
  const data = parsed.data;

  const existingByEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingByEmail && existingByEmail.id !== userId) {
    return "A team member with that email already exists.";
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    include: { secondaryRoles: true },
  });

  const secondaryRoles = parseSecondaryRoles(formData, data.role);
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      title: data.title || null,
      role: data.role,
      avatarUrl: data.avatarUrl || null,
      ...(passwordHash ? { passwordHash } : {}),
      secondaryRoles: {
        deleteMany: {},
        create: secondaryRoles.map((role) => ({ role })),
      },
    },
  });

  if (before) {
    const beforeSecondary = before.secondaryRoles.map((r) => r.role).sort().join(", ");
    const afterSecondary = [...secondaryRoles].sort().join(", ");

    const diffs = diffFields(
      { ...before, secondaryRolesLabel: beforeSecondary },
      { ...before, name: data.name, email: data.email, title: data.title || null, role: data.role, secondaryRolesLabel: afterSecondary },
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "title", label: "Title" },
        { key: "role", label: "Primary Role", format: (v) => ROLE_LABELS[v as Role] },
        { key: "secondaryRolesLabel", label: "Secondary Roles" },
      ]
    );
    if (data.password) {
      diffs.push({ field: "Password", from: "—", to: "Reset" });
    }

    if (diffs.length > 0) {
      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: "TEAM_MEMBER_UPDATED",
        entityType: "User",
        entityId: userId,
        entityLabel: data.name,
        details: diffs,
      });
    }
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  redirect("/team");
}

export async function deleteUserAction(formData: FormData) {
  const currentUser = await requireTeamManager();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect("/team");

  if (userId === currentUser.id) {
    redirect(`/team?error=${encodeURIComponent("You can't remove your own account.")}`);
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { secondaryRoles: true },
  });
  if (!target) redirect("/team");

  const targetIsAdmin = target.role === "ADMIN" || target.secondaryRoles.some((r) => r.role === "ADMIN");
  if (targetIsAdmin) {
    const otherAdmins = await prisma.user.count({
      where: {
        id: { not: userId },
        OR: [{ role: "ADMIN" }, { secondaryRoles: { some: { role: "ADMIN" } } }],
      },
    });
    if (otherAdmins === 0) {
      redirect(`/team?error=${encodeURIComponent("Can't remove the last Administrator.")}`);
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  await logActivity({
    actorId: currentUser.id,
    actorName: currentUser.name,
    action: "TEAM_MEMBER_DELETED",
    entityType: "User",
    entityId: userId,
    entityLabel: target.name,
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  redirect("/team");
}
