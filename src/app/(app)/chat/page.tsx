import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GENERAL_ROOM, roomList, roomSnapshot } from "@/lib/chat";
import ChatWorkspace from "@/components/ChatWorkspace";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [rooms, snapshot, people] = await Promise.all([
    roomList(user.id), roomSnapshot(GENERAL_ROOM, user.id),
    prisma.user.findMany({ select: { id: true, name: true, avatarUrl: true }, orderBy: { name: "asc" } }),
  ]);
  return <ChatWorkspace initialRooms={rooms} initialSnapshot={snapshot} people={people} userId={user.id} isAdmin={user.roles.includes("ADMIN")} />;
}
