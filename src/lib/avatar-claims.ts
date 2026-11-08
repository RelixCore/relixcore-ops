import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isCollectionAvatar } from "./avatars";

export async function takenAvatars(excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: { ...(excludeUserId ? { id: { not: excludeUserId } } : {}), avatarUrl: { startsWith: "/images/avatars/" } },
    select: { avatarUrl: true },
  });
  return users.flatMap((user) => user.avatarUrl ? [user.avatarUrl] : []);
}

export function validAvatarChoice(value: string, previous?: string | null) {
  return value === "" || isCollectionAvatar(value) || (value === previous && !value.startsWith("/images/avatars/"));
}

export function avatarSaveError(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String(error.meta?.target ?? "");
    return target.includes("email") ? "A team member with that email already exists." : "That character was just claimed by another member. Choose another avatar and save again.";
  }
}
