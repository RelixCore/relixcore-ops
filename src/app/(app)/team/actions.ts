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
import { avatarSaveError, validAvatarChoice } from "@/lib/avatar-claims";

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

// Only an Admin may grant/revoke CRM access independent of role — a Growth
// Lead can manage the team but shouldn't be able to hand out CRM edit rights.
function parseCrmAccessOverride(formData: FormData, actor: { roles: Role[] }): boolean | undefined {
  if (!actor.roles.includes("ADMIN")) return undefined;
  return formData.get("crmAccessOverride") === "on";
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

  if (!validAvatarChoice(data.avatarUrl ?? "")) return "Choose an avatar from the collection.";

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return "A team member with that email already exists.";
  }

  const secondaryRoles = parseSecondaryRoles(formData, data.role);
  const crmAccessOverride = parseCrmAccessOverride(formData, actor);
  const passwordHash = await bcrypt.hash(data.password, 10);

  let created;
  try {
    created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        title: data.title || null,
        role: data.role,
        avatarUrl: data.avatarUrl || null,
        passwordHash,
        ...(crmAccessOverride !== undefined ? { crmAccessOverride } : {}),
        secondaryRoles: { create: secondaryRoles.map((role) => ({ role })) },
      },
    });
  } catch (error) {
    const message = avatarSaveError(error);
    if (message) return message;
    throw error;
  }

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

  if (!before) return "This team member no longer exists.";
  if (!validAvatarChoice(data.avatarUrl ?? "", before.avatarUrl)) return "Choose an avatar from the collection.";

  const secondaryRoles = parseSecondaryRoles(formData, data.role);
  const crmAccessOverride = parseCrmAccessOverride(formData, actor);
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        title: data.title || null,
        role: data.role,
        avatarUrl: data.avatarUrl || null,
        ...(passwordHash ? { passwordHash } : {}),
        ...(crmAccessOverride !== undefined ? { crmAccessOverride } : {}),
        secondaryRoles: {
          deleteMany: {},
          create: secondaryRoles.map((role) => ({ role })),
        },
      },
    });
  } catch (error) {
    const message = avatarSaveError(error);
    if (message) return message;
    throw error;
  }

  if (before) {
    const beforeSecondary = before.secondaryRoles.map((r) => r.role).sort().join(", ");
    const afterSecondary = [...secondaryRoles].sort().join(", ");

    const diffs = diffFields(
      { ...before, secondaryRolesLabel: beforeSecondary },
      {
        ...before,
        name: data.name,
        email: data.email,
        title: data.title || null,
        role: data.role,
        avatarUrl: data.avatarUrl || null,
        secondaryRolesLabel: afterSecondary,
        crmAccessOverride: crmAccessOverride ?? before.crmAccessOverride,
      },
      [
        { key: "name", label: "Name" },
        { key: "avatarUrl", label: "Avatar" },
        { key: "email", label: "Email" },
        { key: "title", label: "Title" },
        { key: "role", label: "Primary Role", format: (v) => ROLE_LABELS[v as Role] },
        { key: "secondaryRolesLabel", label: "Secondary Roles" },
        { key: "crmAccessOverride", label: "CRM Access Override", format: (v) => (v ? "Granted" : "Revoked") },
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

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/team");
}

export async function updateMyAvatarAction(_previous: string | undefined, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor) return "Sign in to choose your avatar.";
  const avatarUrl = String(formData.get("avatarUrl") ?? "");
  if (!validAvatarChoice(avatarUrl, actor.avatarUrl)) return "Choose an avatar from the collection.";
  try {
    // The database unique index is authoritative, including concurrent claims.
    await prisma.user.update({ where: { id: actor.id }, data: { avatarUrl: avatarUrl || null } });
  } catch (error) {
    const message = avatarSaveError(error);
    if (message) return message;
    throw error;
  }
  if ((actor.avatarUrl ?? "") !== avatarUrl) {
    await logActivity({ actorId: actor.id, actorName: actor.name, action: "TEAM_MEMBER_UPDATED",
      entityType: "User", entityId: actor.id, entityLabel: actor.name,
      details: [{ field: "Avatar", from: actor.avatarUrl ?? "Initials", to: avatarUrl || "Initials" }] });
  }
  revalidatePath("/", "layout");
  return "Avatar saved.";
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
