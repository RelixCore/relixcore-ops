import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const GENERAL_ROOM = "relixcore-general";
export function accessibleRooms(userId: string): Prisma.ChatRoomWhereInput {
  return { OR: [{ id: GENERAL_ROOM, isGeneral: true }, { members: { some: { userId } } }] };
}
export async function getRoom(roomId: string, userId: string) {
  return prisma.chatRoom.findFirst({ where: { id: roomId, ...accessibleRooms(userId) } });
}
export async function roomList(userId: string) {
  const rooms = await prisma.chatRoom.findMany({
    where: accessibleRooms(userId), orderBy: [{ isGeneral: "desc" }, { createdAt: "asc" }],
    include: { members: { select: { userId: true, lastReadSeq: true, user: { select: { name: true } } } } },
  });
  return Promise.all(rooms.map(async (room) => {
    const where = { roomId: room.id, seq: { gt: room.members.find((member) => member.userId === userId)?.lastReadSeq ?? 0 }, deletedAt: null };
    const [unread, mentions] = await Promise.all([
      prisma.chatMessage.count({ where: { ...where, OR: [{ authorId: null }, { authorId: { not: userId } }] } }),
      prisma.chatMessage.count({ where: { ...where, authorId: { not: userId }, mentionIds: { has: userId } } }),
    ]);
    return { id: room.id, name: room.id.startsWith("dm_") ? room.members.find((member) => member.userId !== userId)?.user.name ?? "Former member" : room.name, isGeneral: room.isGeneral, isDirect: room.id.startsWith("dm_"), unread, mentions };
  }));
}
export async function roomSnapshot(roomId: string, userId: string, before?: number) {
  const room = await getRoom(roomId, userId);
  if (!room) return null;
  const [members, rows] = await Promise.all([
    prisma.user.findMany({ where: room.isGeneral ? {} : { chatMemberships: { some: { roomId } } }, select: { id: true, name: true, avatarUrl: true }, orderBy: { name: "asc" } }),
    prisma.chatMessage.findMany({ where: { roomId, ...(before ? { seq: { lt: before } } : {}) }, orderBy: { seq: "desc" }, take: 51,
      include: { author: { select: { avatarUrl: true } }, replyTo: { select: { id: true, authorName: true, body: true, deletedAt: true } } } }),
  ]);
  return { room: { id: room.id, name: room.id.startsWith("dm_") ? members.find((member) => member.id !== userId)?.name ?? "Former member" : room.name, isGeneral: room.isGeneral, isDirect: room.id.startsWith("dm_"), ownerId: room.ownerId }, members, hasOlder: rows.length > 50,
    messages: rows.slice(0, 50).reverse().map((row) => ({ id: row.id, seq: row.seq, authorId: row.authorId, authorName: row.authorName, avatarUrl: row.author?.avatarUrl ?? null,
      body: row.deletedAt ? "Message removed" : row.body, driveUrl: row.deletedAt ? null : row.driveUrl, mentionIds: row.deletedAt ? [] : row.mentionIds,
      deleted: !!row.deletedAt, createdAt: row.createdAt.toISOString(), replyTo: row.replyTo ? { id: row.replyTo.id, authorName: row.replyTo.authorName, body: row.replyTo.deletedAt ? "Message removed" : row.replyTo.body.slice(0, 160) } : null })) };
}
