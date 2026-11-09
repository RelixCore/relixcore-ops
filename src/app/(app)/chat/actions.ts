"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoom } from "@/lib/chat";
import { messageInput } from "@/lib/chat-validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function sendMessage(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to send messages." };
  const parsed = messageInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
  const data = parsed.data;
  const room = await getRoom(data.roomId, user.id);
  if (!room) return { error: "You no longer have access to this group." };
  if (data.replyToId && !await prisma.chatMessage.findFirst({ where: { id: data.replyToId, roomId: room.id, deletedAt: null } })) return { error: "That message is no longer available to reply to." };
  const mentionIds = [...new Set(data.mentionIds)];
  if (mentionIds.length && await prisma.user.count({ where: { id: { in: mentionIds }, ...(room.isGeneral ? {} : { chatMemberships: { some: { roomId: room.id } } }) } }) !== mentionIds.length) return { error: "You can only mention current group members." };
  // Bound the write rate without relying on a client-side disabled button.
  const recent = await prisma.chatMessage.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent >= 30) return { error: "Please wait a moment before sending more messages." };
  await prisma.chatMessage.create({ data: { roomId: room.id, authorId: user.id, authorName: user.name, body: data.body, driveUrl: data.driveUrl || null, mentionIds, replyToId: data.replyToId } });
  return { ok: true };
}

export async function createGroup(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to create a group." };
  const parsed = z.object({ name: z.string().trim().min(1).max(80), memberIds: z.array(z.string().max(100)).max(200) }).safeParse(input);
  if (!parsed.success) return { error: "Enter a group name (up to 80 characters) and valid members." };
  const ids = [...new Set([user.id, ...parsed.data.memberIds])];
  if (await prisma.user.count({ where: { id: { in: ids } } }) !== ids.length) return { error: "A selected member no longer exists. Refresh and try again." };
  const room = await prisma.chatRoom.create({ data: { name: parsed.data.name, ownerId: user.id, members: { create: ids.map((userId) => ({ userId })) } } });
  revalidatePath("/chat");
  return { roomId: room.id };
}

export async function changeGroupMember(roomId: string, memberId: string, add: boolean) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to manage members." };
  const room = await getRoom(roomId, user.id);
  if (!room || room.isGeneral || (room.ownerId !== user.id && !user.roles.includes("ADMIN"))) return { error: "Only the group creator or an administrator in this group can manage its members." };
  if (!add && (memberId === room.ownerId || memberId === user.id)) return { error: "You cannot remove yourself or the group creator." };
  if (add) {
    if (!await prisma.user.findUnique({ where: { id: memberId }, select: { id: true } })) return { error: "Member no longer exists." };
    await prisma.chatMember.upsert({ where: { roomId_userId: { roomId, userId: memberId } }, create: { roomId, userId: memberId }, update: {} });
  } else await prisma.chatMember.deleteMany({ where: { roomId, userId: memberId } });
  return { ok: true };
}

export async function removeMessage(messageId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to remove messages." };
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message || !await getRoom(message.roomId, user.id)) return { error: "Message not available." };
  if (message.authorId !== user.id && !user.roles.includes("ADMIN")) return { error: "Only the sender or an administrator can remove a message." };
  await prisma.chatMessage.update({ where: { id: message.id }, data: { body: "", driveUrl: null, mentionIds: [], deletedAt: new Date() } });
  return { ok: true };
}

export async function markChatRead(roomId: string, seq: number) {
  const user = await getCurrentUser();
  if (!user || !Number.isSafeInteger(seq) || seq < 1 || !await getRoom(roomId, user.id)) return;
  if (!await prisma.chatMessage.findFirst({ where: { roomId, seq }, select: { id: true } })) return;
  await prisma.chatMember.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id }, update: {} });
  // Monotonic: a slower tab cannot move the read marker backwards.
  await prisma.chatMember.updateMany({ where: { roomId, userId: user.id, lastReadSeq: { lt: seq } }, data: { lastReadSeq: seq } });
}
